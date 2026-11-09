namespace FlightTracker.Api.Sources.OpenSky;

public class OpenSkyOptions
{
    // Set with user-secrets on the PC and environment variables on the Pi. Never in appsettings.
    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";

    public string TokenUrl { get; set; } = "";
    public string ApiUrl { get; set; } = "";

    // Bounding box around Hamilton.
    public double LatMin { get; set; }
    public double LatMax { get; set; }
    public double LonMin { get; set; }
    public double LonMax { get; set; }
}
