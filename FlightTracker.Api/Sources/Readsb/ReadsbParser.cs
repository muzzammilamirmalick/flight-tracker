using System.Text.Json;

namespace FlightTracker.Api.Sources.Readsb;

// Turns readsb's aircraft.json into AircraftState records.
// readsb already uses feet, knots and feet per minute, so no unit conversion is needed.
// See https://github.com/wiedehopf/readsb/blob/dev/README-json.md
public static class ReadsbParser
{
    // readsb stops treating lat/lon as valid after 60 seconds without a new position.
    private const double MaxPositionAgeSeconds = 60;

    public static List<AircraftState> Parse(string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        var planes = new List<AircraftState>();

        var now = GetDouble(root, "now");
        if (now is null || !root.TryGetProperty("aircraft", out var aircraft) ||
            aircraft.ValueKind != JsonValueKind.Array)
        {
            return planes;
        }

        foreach (var item in aircraft.EnumerateArray())
        {
            var plane = ParseAircraft(item, now.Value);
            if (plane is not null)
            {
                planes.Add(plane);
            }
        }

        return planes;
    }

    private static AircraftState? ParseAircraft(JsonElement item, double now)
    {
        var hex = GetString(item, "hex");
        var latitude = GetDouble(item, "lat");
        var longitude = GetDouble(item, "lon");
        var secondsSincePosition = GetDouble(item, "seen_pos");

        // A "~" in front means a non-ICAO address (for example from TIS-B). We only keep real ICAO codes.
        if (hex is null || hex.StartsWith('~'))
        {
            return null;
        }

        // Skip planes with no position or a position that is too old to trust.
        if (latitude is null || longitude is null || secondsSincePosition is null ||
            secondsSincePosition > MaxPositionAgeSeconds)
        {
            return null;
        }

        // alt_baro is the string "ground" when the plane is on the ground. Skip those, like we do for OpenSky.
        if (GetString(item, "alt_baro") == "ground")
        {
            return null;
        }

        var altitude = GetDouble(item, "alt_baro") ?? GetDouble(item, "alt_geom");
        var verticalRate = GetDouble(item, "baro_rate") ?? GetDouble(item, "geom_rate");
        var positionTime = DateTimeOffset.FromUnixTimeMilliseconds((long)Math.Round((now - secondsSincePosition.Value) * 1000));

        return new AircraftState(
            Icao24: hex.Trim().ToLowerInvariant(),
            Callsign: CleanCallsign(GetString(item, "flight")),
            Time: positionTime.UtcDateTime,
            Latitude: latitude.Value,
            Longitude: longitude.Value,
            AltitudeFt: altitude is null ? null : (int)Math.Round(altitude.Value),
            SpeedKts: GetDouble(item, "gs"),
            Heading: GetDouble(item, "track") ?? GetDouble(item, "true_heading"),
            VerticalRate: verticalRate is null ? null : (int)Math.Round(verticalRate.Value));
    }

    // readsb pads callsigns to 8 characters with spaces.
    private static string? CleanCallsign(string? callsign)
    {
        var trimmed = callsign?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private static string? GetString(JsonElement item, string name) =>
        item.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

    private static double? GetDouble(JsonElement item, string name) =>
        item.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number ? value.GetDouble() : null;
}
