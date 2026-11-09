namespace FlightTracker.Api.Sources;

// One plane's position from any source, already converted to feet, knots and feet per minute.
public record AircraftState(
    string Icao24,
    string? Callsign,
    DateTime Time,
    double Latitude,
    double Longitude,
    int? AltitudeFt,
    double? SpeedKts,
    double? Heading,
    int? VerticalRate);
