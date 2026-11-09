using FlightTracker.Api.Data;
using FlightTracker.Api.Models;
using FlightTracker.Api.Sources;
using Microsoft.EntityFrameworkCore;

namespace FlightTracker.Api.Services;

public class SightingSaver(FlightTrackerDbContext db)
{
    // Saves new positions and updates each plane's LastSeen. Returns how many sightings were added.
    public async Task<int> SaveAsync(IReadOnlyList<AircraftState> states, CancellationToken cancellationToken)
    {
        if (states.Count == 0)
        {
            return 0;
        }

        var icaoCodes = states.Select(s => s.Icao24).Distinct().ToList();
        var knownAircraft = await db.Aircraft
            .Where(a => icaoCodes.Contains(a.Icao24))
            .ToDictionaryAsync(a => a.Icao24, cancellationToken);

        var added = 0;
        foreach (var state in states)
        {
            if (!knownAircraft.TryGetValue(state.Icao24, out var aircraft))
            {
                aircraft = new Aircraft { Icao24 = state.Icao24, FirstSeen = state.Time };
                db.Aircraft.Add(aircraft);
                knownAircraft[state.Icao24] = aircraft;
            }
            else if (state.Time <= aircraft.LastSeen)
            {
                // Same position as last poll, nothing new to save.
                continue;
            }

            aircraft.LastSeen = state.Time;
            if (state.Callsign is not null)
            {
                aircraft.Callsign = state.Callsign;
            }

            db.Sightings.Add(ToSighting(state));
            added++;
        }

        await db.SaveChangesAsync(cancellationToken);
        return added;
    }

    private static Sighting ToSighting(AircraftState state) => new()
    {
        Icao24 = state.Icao24,
        Time = state.Time,
        Latitude = state.Latitude,
        Longitude = state.Longitude,
        AltitudeFt = state.AltitudeFt,
        SpeedKts = state.SpeedKts,
        Heading = state.Heading,
        VerticalRate = state.VerticalRate,
    };
}
