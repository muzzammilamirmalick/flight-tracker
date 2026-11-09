using FlightTracker.Api.Data;
using FlightTracker.Api.Endpoints;
using FlightTracker.Api.Services.Details;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FlightTracker.Api.Services;

public class PlaneQueries(FlightTrackerDbContext db, IOptions<HomeOptions> home, RouteCache routeCache, TimeProvider clock)
{
    // A plane counts as "live" if we got a position for it in this window.
    public static readonly TimeSpan LiveWindow = TimeSpan.FromMinutes(2);

    // Every live plane with its latest position.
    public async Task<List<LivePlaneDto>> GetLivePlanesAsync(CancellationToken cancellationToken)
    {
        var cutoff = clock.GetUtcNow().UtcDateTime - LiveWindow;

        var rows = await db.Aircraft
            .Where(a => a.LastSeen >= cutoff)
            .Select(a => new
            {
                Aircraft = a,
                // Only look at recent sightings, so the database does not sort the whole table.
                Latest = a.Sightings
                    .Where(s => s.Time >= cutoff)
                    .OrderByDescending(s => s.Time)
                    .FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        return rows
            .Where(r => r.Latest is not null)
            .Select(r => new LivePlaneDto(
                r.Aircraft.Icao24,
                r.Aircraft.Callsign,
                r.Aircraft.Registration,
                r.Aircraft.TypeCode,
                r.Aircraft.Manufacturer,
                r.Aircraft.Model,
                r.Aircraft.Operator,
                r.Latest!.Latitude,
                r.Latest.Longitude,
                r.Latest.AltitudeFt,
                r.Latest.SpeedKts,
                r.Latest.Heading,
                r.Latest.VerticalRate,
                r.Latest.Time,
                FindRoute(r.Aircraft.Callsign)))
            .OrderBy(p => p.Callsign ?? p.Icao24)
            .ToList();
    }

    // The live planes closest to home, nearest first.
    public async Task<List<OverheadPlaneDto>> GetOverheadAsync(int limit, CancellationToken cancellationToken)
    {
        var homePoint = home.Value;
        var livePlanes = await GetLivePlanesAsync(cancellationToken);

        return livePlanes
            .Select(p => new OverheadPlaneDto(p, Math.Round(
                Haversine.DistanceKm(homePoint.Latitude, homePoint.Longitude, p.Latitude, p.Longitude), 2)))
            .OrderBy(o => o.DistanceKm)
            .Take(limit)
            .ToList();
    }

    // One plane's path over the last few hours. Returns null if we have never seen the plane.
    public async Task<PlaneHistoryDto?> GetHistoryAsync(string icao24, int hours, CancellationToken cancellationToken)
    {
        var aircraft = await db.Aircraft.FirstOrDefaultAsync(a => a.Icao24 == icao24, cancellationToken);
        if (aircraft is null)
        {
            return null;
        }

        var since = clock.GetUtcNow().UtcDateTime.AddHours(-hours);
        var points = await db.Sightings
            .Where(s => s.Icao24 == icao24 && s.Time >= since)
            .OrderBy(s => s.Time)
            .Select(s => new HistoryPointDto(s.Time, s.Latitude, s.Longitude, s.AltitudeFt, s.SpeedKts, s.Heading))
            .ToListAsync(cancellationToken);

        return new PlaneHistoryDto(
            aircraft.Icao24,
            aircraft.Callsign,
            aircraft.Registration,
            aircraft.TypeCode,
            aircraft.Manufacturer,
            aircraft.Model,
            aircraft.Operator,
            aircraft.FirstSeen,
            aircraft.LastSeen,
            points);
    }

    // Recent positions for every live plane, used to draw fading trails on the map.
    public async Task<List<TrailDto>> GetTrailsAsync(int minutes, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var liveCutoff = now - LiveWindow;
        var since = now.AddMinutes(-minutes);

        var points = await db.Sightings
            .Where(s => s.Time >= since && s.Aircraft!.LastSeen >= liveCutoff)
            .OrderBy(s => s.Icao24)
            .ThenBy(s => s.Time)
            .Select(s => new { s.Icao24, Point = new TrailPointDto(s.Time, s.Latitude, s.Longitude, s.AltitudeFt) })
            .ToListAsync(cancellationToken);

        return points
            .GroupBy(p => p.Icao24)
            .Select(g => new TrailDto(g.Key, g.Select(p => p.Point).ToList()))
            .ToList();
    }

    // Routes come from the in-memory cache that AircraftDetailsLookup fills.
    private FlightRoute? FindRoute(string? callsign) =>
        callsign is not null && routeCache.TryGet(callsign, out var route) ? route : null;
}
