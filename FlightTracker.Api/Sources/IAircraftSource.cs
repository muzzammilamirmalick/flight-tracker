namespace FlightTracker.Api.Sources;

// Something that can tell us which planes are in the air right now (OpenSky or the Pi receiver).
public interface IAircraftSource
{
    Task<IReadOnlyList<AircraftState>> GetAircraftAsync(CancellationToken cancellationToken);
}
