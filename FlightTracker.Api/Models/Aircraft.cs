namespace FlightTracker.Api.Models;

// One row per plane, keyed by its ICAO 24-bit address (6 hex characters).
public class Aircraft
{
    public string Icao24 { get; set; } = "";
    public string? Callsign { get; set; }

    // Filled in once from adsbdb.com by AircraftDetailsLookup.
    public string? Registration { get; set; }
    public string? TypeCode { get; set; }       // ICAO type code, like B38M
    public string? Manufacturer { get; set; }   // like Boeing
    public string? Model { get; set; }          // like 737 MAX 8
    public string? Operator { get; set; }       // registered owner, like Air Canada

    // Set when we asked adsbdb about this plane, even if it did not know it. Null means not asked yet.
    public DateTime? DetailsLookedUpAt { get; set; }

    // All times are stored in UTC.
    public DateTime FirstSeen { get; set; }
    public DateTime LastSeen { get; set; }

    public List<Sighting> Sightings { get; set; } = [];
}
