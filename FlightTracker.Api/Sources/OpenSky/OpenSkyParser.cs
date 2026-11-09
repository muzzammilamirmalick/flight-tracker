using System.Text.Json;

namespace FlightTracker.Api.Sources.OpenSky;

// Turns the /states/all response into AircraftState records.
// Each state is a JSON array, so we read fields by index.
// See https://openskynetwork.github.io/opensky-api/rest.html
public static class OpenSkyParser
{
    private const int Icao24 = 0;
    private const int Callsign = 1;
    private const int TimePosition = 3;
    private const int LastContact = 4;
    private const int Longitude = 5;
    private const int Latitude = 6;
    private const int BaroAltitude = 7;
    private const int OnGround = 8;
    private const int Velocity = 9;
    private const int TrueTrack = 10;
    private const int VerticalRate = 11;
    private const int GeoAltitude = 13;

    public static List<AircraftState> Parse(string json)
    {
        using var document = JsonDocument.Parse(json);
        var planes = new List<AircraftState>();

        // "states" is null when there are no planes in the box.
        if (!document.RootElement.TryGetProperty("states", out var states) ||
            states.ValueKind != JsonValueKind.Array)
        {
            return planes;
        }

        foreach (var row in states.EnumerateArray())
        {
            var plane = ParseState(row);
            if (plane is not null)
            {
                planes.Add(plane);
            }
        }

        return planes;
    }

    private static AircraftState? ParseState(JsonElement row)
    {
        var icao24 = GetString(row, Icao24);
        var latitude = GetDouble(row, Latitude);
        var longitude = GetDouble(row, Longitude);
        var unixTime = GetLong(row, TimePosition) ?? GetLong(row, LastContact);

        // Skip planes with no position, and planes parked or taxiing on the ground.
        if (icao24 is null || latitude is null || longitude is null || unixTime is null)
        {
            return null;
        }

        if (GetBool(row, OnGround) == true)
        {
            return null;
        }

        var altitudeMeters = GetDouble(row, BaroAltitude) ?? GetDouble(row, GeoAltitude);
        var velocity = GetDouble(row, Velocity);
        var verticalRate = GetDouble(row, VerticalRate);

        return new AircraftState(
            Icao24: icao24.Trim().ToLowerInvariant(),
            Callsign: CleanCallsign(GetString(row, Callsign)),
            Time: DateTimeOffset.FromUnixTimeSeconds(unixTime.Value).UtcDateTime,
            Latitude: latitude.Value,
            Longitude: longitude.Value,
            AltitudeFt: altitudeMeters is null ? null : UnitConverter.MetersToFeet(altitudeMeters.Value),
            SpeedKts: velocity is null ? null : UnitConverter.MetersPerSecondToKnots(velocity.Value),
            Heading: GetDouble(row, TrueTrack),
            VerticalRate: verticalRate is null ? null : UnitConverter.MetersPerSecondToFeetPerMinute(verticalRate.Value));
    }

    // OpenSky pads callsigns with spaces, and sometimes sends an empty one.
    private static string? CleanCallsign(string? callsign)
    {
        var trimmed = callsign?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private static JsonElement? GetField(JsonElement row, int index)
    {
        if (index >= row.GetArrayLength())
        {
            return null;
        }

        var field = row[index];
        return field.ValueKind == JsonValueKind.Null ? null : field;
    }

    private static string? GetString(JsonElement row, int index) =>
        GetField(row, index) is { ValueKind: JsonValueKind.String } field ? field.GetString() : null;

    private static double? GetDouble(JsonElement row, int index) =>
        GetField(row, index) is { ValueKind: JsonValueKind.Number } field ? field.GetDouble() : null;

    private static long? GetLong(JsonElement row, int index) =>
        GetField(row, index) is { ValueKind: JsonValueKind.Number } field ? (long)field.GetDouble() : null;

    private static bool? GetBool(JsonElement row, int index) =>
        GetField(row, index) is { ValueKind: JsonValueKind.True or JsonValueKind.False } field ? field.GetBoolean() : null;
}
