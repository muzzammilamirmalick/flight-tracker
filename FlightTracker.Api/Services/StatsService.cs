using System.Text.RegularExpressions;
using FlightTracker.Api.Data;
using FlightTracker.Api.Endpoints;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FlightTracker.Api.Services;

public class StatsService(FlightTrackerDbContext db, IOptions<HomeOptions> home, TimeProvider clock)
{
    private const int TopAirlineCount = 5;

    // Three letters followed by a digit, like ACA123 or WJA4.
    private static readonly Regex AirlineCallsign = new(@"^([A-Z]{3})\d", RegexOptions.Compiled);

    // Stats for today, where "today" starts at midnight in the home time zone.
    public async Task<StatsDto> GetTodayAsync(CancellationToken cancellationToken)
    {
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(home.Value.TimeZone);
        var localNow = TimeZoneInfo.ConvertTime(clock.GetUtcNow(), timeZone);
        var startOfTodayUtc = TimeZoneInfo.ConvertTimeToUtc(localNow.Date, timeZone);

        var todaysSightings = db.Sightings.Where(s => s.Time >= startOfTodayUtc);

        var planesToday = await db.Aircraft.CountAsync(a => a.LastSeen >= startOfTodayUtc, cancellationToken);

        var highest = await ToRecord(todaysSightings
            .Where(s => s.AltitudeFt != null)
            .OrderByDescending(s => s.AltitudeFt))
            .FirstOrDefaultAsync(cancellationToken);

        var lowest = await ToRecord(todaysSightings
            .Where(s => s.AltitudeFt != null)
            .OrderBy(s => s.AltitudeFt))
            .FirstOrDefaultAsync(cancellationToken);

        var fastest = await ToRecord(todaysSightings
            .Where(s => s.SpeedKts != null)
            .OrderByDescending(s => s.SpeedKts))
            .FirstOrDefaultAsync(cancellationToken);

        var first = await ToRecord(todaysSightings.OrderBy(s => s.Time)).FirstOrDefaultAsync(cancellationToken);
        var latest = await ToRecord(todaysSightings.OrderByDescending(s => s.Time)).FirstOrDefaultAsync(cancellationToken);

        var hourly = await GetPlanesPerHourAsync(startOfTodayUtc, timeZone, cancellationToken);

        return new StatsDto(
            DateOnly.FromDateTime(localNow.Date),
            planesToday,
            GetBusiestHour(hourly),
            hourly,
            await GetTopAirlinesAsync(startOfTodayUtc, cancellationToken),
            highest,
            lowest,
            fastest,
            first,
            latest);
    }

    private static IQueryable<RecordPlaneDto> ToRecord(IQueryable<Models.Sighting> sightings) =>
        sightings.Select(s => new RecordPlaneDto(
            s.Icao24,
            s.Aircraft!.Callsign,
            s.Aircraft.Manufacturer,
            s.Aircraft.Model,
            s.AltitudeFt,
            s.SpeedKts,
            s.Time));

    // How many different planes were seen in each local hour today. Index 0 is midnight to 1 AM.
    private async Task<int[]> GetPlanesPerHourAsync(
        DateTime startOfTodayUtc, TimeZoneInfo timeZone, CancellationToken cancellationToken)
    {
        // Group by UTC hour in the database. Toronto's offset is always whole hours,
        // so each UTC hour lines up with exactly one local hour.
        var hours = await db.Sightings
            .Where(s => s.Time >= startOfTodayUtc)
            .GroupBy(s => new { s.Time.Date, s.Time.Hour })
            .Select(g => new
            {
                g.Key.Date,
                g.Key.Hour,
                Planes = g.Select(s => s.Icao24).Distinct().Count(),
            })
            .ToListAsync(cancellationToken);

        var perHour = new int[24];
        foreach (var hour in hours)
        {
            var utcHour = DateTime.SpecifyKind(hour.Date.AddHours(hour.Hour), DateTimeKind.Utc);
            var localHour = TimeZoneInfo.ConvertTimeFromUtc(utcHour, timeZone).Hour;

            // On the day the clocks go back, two UTC hours share one local hour, so add them up.
            perHour[localHour] += hour.Planes;
        }

        return perHour;
    }

    private static BusiestHourDto? GetBusiestHour(int[] planesPerHour)
    {
        var most = planesPerHour.Max();
        return most == 0 ? null : new BusiestHourDto(Array.IndexOf(planesPerHour, most), most);
    }

    // Airlines are worked out from the callsign: "ACA123" belongs to ACA (Air Canada).
    private async Task<List<AirlineCountDto>> GetTopAirlinesAsync(
        DateTime startOfTodayUtc, CancellationToken cancellationToken)
    {
        var callsigns = await db.Aircraft
            .Where(a => a.LastSeen >= startOfTodayUtc && a.Callsign != null)
            .Select(a => a.Callsign!)
            .ToListAsync(cancellationToken);

        return callsigns
            .Select(GetAirlineCode)
            .OfType<string>()
            .GroupBy(code => code)
            .Select(g => new AirlineCountDto(g.Key, g.Count()))
            .OrderByDescending(a => a.Planes)
            .ThenBy(a => a.Code)
            .Take(TopAirlineCount)
            .ToList();
    }

    // Airline callsigns are 3 letters then a flight number. Private planes use their registration instead
    // (like "CGABC"), so those return null.
    public static string? GetAirlineCode(string callsign)
    {
        var match = AirlineCallsign.Match(callsign);
        return match.Success ? match.Groups[1].Value : null;
    }
}
