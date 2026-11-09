namespace FlightTracker.Api.Models;

// One row per plane, keyed by its ICAO 24-bit address (6 hex characters).
public class Aircraft
{
    public string Icao24 { get; set; } = "";
    public string? Callsign { get; set; }
    public string? Registration { get; set; }
    public string? TypeCode { get; set; }
    public string? Operator { get; set; }

    // All times are stored in UTC.
    public DateTime FirstSeen { get; set; }
    public DateTime LastSeen { get; set; }

    public List<Sighting> Sightings { get; set; } = [];
}
