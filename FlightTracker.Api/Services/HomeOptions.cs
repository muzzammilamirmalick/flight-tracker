namespace FlightTracker.Api.Services;

// My home point, used for "overhead" distances and for what "today" means in stats.
public class HomeOptions
{
    public double Latitude { get; set; } = 43.25;
    public double Longitude { get; set; } = -79.87;
    public string TimeZone { get; set; } = "America/Toronto";
}
