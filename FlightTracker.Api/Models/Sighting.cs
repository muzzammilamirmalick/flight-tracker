namespace FlightTracker.Api.Models;

// One position report for a plane at a point in time.
public class Sighting
{
    public long Id { get; set; }
    public string Icao24 { get; set; } = "";
    public DateTime Time { get; set; }

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public int? AltitudeFt { get; set; }
    public double? SpeedKts { get; set; }
    public double? Heading { get; set; }

    // Feet per minute, negative when descending.
    public int? VerticalRate { get; set; }

    public Aircraft? Aircraft { get; set; }
}
