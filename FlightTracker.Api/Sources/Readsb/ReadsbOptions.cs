namespace FlightTracker.Api.Sources.Readsb;

public class ReadsbOptions
{
    // The aircraft.json file served by tar1090 on the Pi.
    public string Url { get; set; } = "";
    public int PollIntervalSeconds { get; set; } = 10;
}
