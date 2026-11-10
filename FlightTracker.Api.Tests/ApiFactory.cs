using FlightTracker.Api.Data;
using FlightTracker.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Time.Testing;

namespace FlightTracker.Api.Tests;

// Starts the real API in memory for endpoint tests, with:
// - an in-memory SQLite database instead of PostgreSQL, so tests run anywhere
// - a fake clock, so "live" and "today" are always the same
// - no background jobs, so nothing polls the receiver or adsbdb during tests
public class ApiFactory : WebApplicationFactory<Program>
{
    // 3 PM in Hamilton (EST is UTC-5).
    public static readonly DateTimeOffset Now = new(2026, 11, 9, 20, 0, 0, TimeSpan.Zero);

    public FakeTimeProvider Clock { get; } = new(Now);

    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    public ApiFactory()
    {
        // The in-memory database lives as long as this connection is open.
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:FlightTracker", "Host=not-used-in-tests");
        builder.UseSetting("AircraftSource", "Readsb");
        builder.UseSetting("Readsb:Url", "http://localhost/not-used-in-tests");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IHostedService>();

            // Swap PostgreSQL for SQLite.
            services.RemoveAll<DbContextOptions<FlightTrackerDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<FlightTrackerDbContext>>();
            services.AddDbContext<FlightTrackerDbContext>(options =>
                options.UseSqlite(_connection).UseSnakeCaseNamingConvention());

            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
        });
    }

    // Creates the tables and adds the given planes. Call once at the start of each test class.
    public void Seed(params Aircraft[] aircraft)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FlightTrackerDbContext>();
        db.Database.EnsureDeleted();
        db.Database.EnsureCreated();
        db.Aircraft.AddRange(aircraft);
        db.SaveChanges();
    }

    // A plane with one sighting per given position, the last one being the most recent.
    public static Aircraft Plane(string icao24, string callsign, params (DateTime Time, double Lat, double Lon, int Alt)[] positions)
    {
        var plane = new Aircraft
        {
            Icao24 = icao24,
            Callsign = callsign,
            FirstSeen = positions.First().Time,
            LastSeen = positions.Last().Time,
        };

        foreach (var (time, lat, lon, alt) in positions)
        {
            plane.Sightings.Add(new Sighting
            {
                Icao24 = icao24,
                Time = time,
                Latitude = lat,
                Longitude = lon,
                AltitudeFt = alt,
                SpeedKts = 300,
                Heading = 90,
                VerticalRate = 0,
            });
        }

        return plane;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}
