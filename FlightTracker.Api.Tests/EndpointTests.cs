using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace FlightTracker.Api.Tests;

public class EndpointTests : IClassFixture<ApiFactory>
{
    private static readonly DateTime Now = ApiFactory.Now.UtcDateTime;
    private readonly HttpClient _client;

    public EndpointTests(ApiFactory factory)
    {
        factory.Seed(
            // About 1 km north of home, two sightings.
            ApiFactory.Plane("c07c7b", "ACA123",
                (Now.AddSeconds(-60), 43.30, -79.87, 30000),
                (Now.AddSeconds(-10), 43.26, -79.87, 31000)),
            // About 17 km north of home.
            ApiFactory.Plane("c0ffee", "WJA45",
                (Now.AddSeconds(-20), 43.40, -79.87, 12000)),
            // Seen 10 minutes ago, so no longer live.
            ApiFactory.Plane("a1b2c3", "UAL970",
                (Now.AddMinutes(-10), 43.10, -79.87, 35000)));

        _client = factory.CreateClient();
    }

    private async Task<JsonElement> GetJson(string url)
    {
        var response = await _client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task<HttpStatusCode> GetStatus(string url) => (await _client.GetAsync(url)).StatusCode;

    [Fact]
    public async Task Health_says_the_tracker_is_running()
    {
        var json = await GetJson("/api/health");
        Assert.Equal("Flight tracker is running", json.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Live_has_only_recent_planes_with_their_latest_position()
    {
        var planes = (await GetJson("/api/planes/live")).EnumerateArray().ToList();

        Assert.Equal(["ACA123", "WJA45"], planes.Select(p => p.GetProperty("callsign").GetString()));
        Assert.Equal(43.26, planes[0].GetProperty("latitude").GetDouble());
        Assert.Equal(31000, planes[0].GetProperty("altitudeFt").GetInt32());
    }

    [Fact]
    public async Task Overhead_is_sorted_by_distance_from_home()
    {
        var planes = (await GetJson("/api/planes/overhead?limit=2")).EnumerateArray().ToList();

        Assert.Equal("c07c7b", planes[0].GetProperty("plane").GetProperty("icao24").GetString());
        Assert.InRange(planes[0].GetProperty("distanceKm").GetDouble(), 1.0, 1.2);
        Assert.InRange(planes[1].GetProperty("distanceKm").GetDouble(), 16, 18);
    }

    [Theory]
    [InlineData("/api/planes/overhead?limit=0")]
    [InlineData("/api/planes/overhead?limit=51")]
    [InlineData("/api/planes/not-hex/history")]
    [InlineData("/api/planes/c07c7b/history?hours=0")]
    [InlineData("/api/planes/trails?minutes=31")]
    [InlineData("/api/replay")]
    [InlineData("/api/replay?from=2026-11-09T20:00:00Z&to=2026-11-09T19:00:00Z")]
    [InlineData("/api/replay?from=2026-11-09T10:00:00Z&to=2026-11-09T13:00:00Z")]
    public async Task Bad_input_returns_400(string url)
    {
        Assert.Equal(HttpStatusCode.BadRequest, await GetStatus(url));
    }

    [Fact]
    public async Task History_of_an_unknown_plane_returns_404()
    {
        Assert.Equal(HttpStatusCode.NotFound, await GetStatus("/api/planes/abcdef/history"));
    }

    [Fact]
    public async Task History_has_the_path_oldest_first_and_accepts_upper_case()
    {
        var json = await GetJson("/api/planes/C07C7B/history?hours=1");
        var latitudes = json.GetProperty("points").EnumerateArray().Select(p => p.GetProperty("latitude").GetDouble());

        Assert.Equal("c07c7b", json.GetProperty("icao24").GetString());
        Assert.Equal([43.30, 43.26], latitudes);
    }

    [Fact]
    public async Task Trails_cover_live_planes_only()
    {
        var trails = (await GetJson("/api/planes/trails?minutes=5")).EnumerateArray()
            .ToDictionary(t => t.GetProperty("icao24").GetString()!, t => t.GetProperty("points").GetArrayLength());

        Assert.Equal(2, trails["c07c7b"]);
        Assert.Equal(1, trails["c0ffee"]);
        Assert.False(trails.ContainsKey("a1b2c3"));
    }

    [Fact]
    public async Task Stats_count_todays_planes_by_local_hour()
    {
        var stats = await GetJson("/api/stats");
        var perHour = stats.GetProperty("planesPerHour").EnumerateArray().Select(h => h.GetInt32()).ToList();

        // All sightings are between 2 and 3 PM in Hamilton.
        Assert.Equal(3, stats.GetProperty("planesToday").GetInt32());
        Assert.Equal(24, perHour.Count);
        Assert.Equal(3, perHour[14]);
        Assert.Equal(14, stats.GetProperty("busiestHour").GetProperty("hour").GetInt32());
        Assert.Equal("2026-11-09", stats.GetProperty("date").GetString());
    }

    [Fact]
    public async Task Stats_have_the_records_of_the_day()
    {
        var stats = await GetJson("/api/stats");

        Assert.Equal("UAL970", stats.GetProperty("highest").GetProperty("callsign").GetString());
        Assert.Equal(12000, stats.GetProperty("lowest").GetProperty("altitudeFt").GetInt32());
        Assert.Equal("UAL970", stats.GetProperty("firstPlane").GetProperty("callsign").GetString());
        Assert.Equal("ACA123", stats.GetProperty("latestPlane").GetProperty("callsign").GetString());
        Assert.Equal(3, stats.GetProperty("topAirlines").GetArrayLength());
    }

    [Fact]
    public async Task Replay_returns_sightings_in_the_range_sorted_by_plane_and_time()
    {
        var points = (await GetJson("/api/replay?from=2026-11-09T19:00:00Z&to=2026-11-09T20:00:00Z")).EnumerateArray()
            .Select(p => p.GetProperty("icao24").GetString())
            .ToList();

        Assert.Equal(["a1b2c3", "c07c7b", "c07c7b", "c0ffee"], points);
    }

    [Fact]
    public async Task Replay_outside_the_data_is_empty()
    {
        var points = await GetJson("/api/replay?from=2026-11-09T10:00:00Z&to=2026-11-09T11:00:00Z");
        Assert.Equal(0, points.GetArrayLength());
    }

    [Fact]
    public async Task Receiver_status_names_the_source()
    {
        var status = await GetJson("/api/receiver");

        Assert.Equal("Readsb", status.GetProperty("source").GetString());
        Assert.False(status.GetProperty("online").GetBoolean());
    }
}
