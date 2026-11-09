using FlightTracker.Api.Services.Details;

namespace FlightTracker.Api.Endpoints;

// What the API sends back. All times are UTC.

public record LivePlaneDto(
    string Icao24,
    string? Callsign,
    string? Registration,
    string? TypeCode,
    string? Manufacturer,
    string? Model,
    string? Operator,
    double Latitude,
    double Longitude,
    int? AltitudeFt,
    double? SpeedKts,
    double? Heading,
    int? VerticalRate,
    DateTime LastSeen,
    FlightRoute? Route);

public record OverheadPlaneDto(LivePlaneDto Plane, double DistanceKm);

public record HistoryPointDto(
    DateTime Time,
    double Latitude,
    double Longitude,
    int? AltitudeFt,
    double? SpeedKts,
    double? Heading);

public record PlaneHistoryDto(
    string Icao24,
    string? Callsign,
    string? Registration,
    string? TypeCode,
    string? Manufacturer,
    string? Model,
    string? Operator,
    DateTime FirstSeen,
    DateTime LastSeen,
    List<HistoryPointDto> Points);

// Recent positions of one live plane, oldest first, for drawing its trail.
public record TrailDto(string Icao24, List<TrailPointDto> Points);

public record TrailPointDto(DateTime Time, double Latitude, double Longitude, int? AltitudeFt);

public record StatsDto(
    DateOnly Date,
    int PlanesToday,
    BusiestHourDto? BusiestHour,
    List<AirlineCountDto> TopAirlines,
    RecordPlaneDto? Highest,
    RecordPlaneDto? Fastest);

// Hour is local time at home, 0 to 23.
public record BusiestHourDto(int Hour, int Planes);

public record AirlineCountDto(string Code, int Planes);

public record RecordPlaneDto(string Icao24, string? Callsign, int? AltitudeFt, double? SpeedKts, DateTime Time);
