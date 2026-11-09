using System.Net;
using System.Text.Json.Serialization;

namespace FlightTracker.Api.Services.Details;

public record AircraftDetails(string? Registration, string? TypeCode, string? Manufacturer, string? Model, string? Operator);

public record Airport(string? Code, string? Name, string? City, double? Latitude, double? Longitude);

public record FlightRoute(string? AirlineName, Airport? Origin, Airport? Destination);

// Talks to the free adsbdb.com API. See https://github.com/mrjackwills/adsbdb
// Returns null when adsbdb does not know the plane or callsign (it answers 404).
// Throws if the service is down, so the caller can try again later.
public class AdsbdbClient(HttpClient httpClient)
{
    public async Task<AircraftDetails?> GetAircraftAsync(string icao24, CancellationToken cancellationToken)
    {
        var body = await GetAsync<AircraftBody>($"aircraft/{icao24}", cancellationToken);
        var aircraft = body?.Response?.Aircraft;
        if (aircraft is null)
        {
            return null;
        }

        return new AircraftDetails(
            aircraft.Registration,
            aircraft.IcaoType,
            aircraft.Manufacturer,
            aircraft.Type,
            aircraft.RegisteredOwner);
    }

    public async Task<FlightRoute?> GetRouteAsync(string callsign, CancellationToken cancellationToken)
    {
        var body = await GetAsync<RouteBody>($"callsign/{Uri.EscapeDataString(callsign)}", cancellationToken);
        var route = body?.Response?.FlightRoute;
        if (route is null)
        {
            return null;
        }

        return new FlightRoute(route.Airline?.Name, ToAirport(route.Origin), ToAirport(route.Destination));
    }

    private async Task<T?> GetAsync<T>(string path, CancellationToken cancellationToken)
    {
        using var response = await httpClient.GetAsync(path, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return default;
        }

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>(cancellationToken);
    }

    private static Airport? ToAirport(AirportJson? airport) =>
        airport is null
            ? null
            : new Airport(airport.IataCode ?? airport.IcaoCode, airport.Name, airport.Municipality, airport.Latitude, airport.Longitude);

    // The JSON shapes adsbdb sends back. Only the fields we use.

    private record AircraftBody(AircraftResponse? Response);

    private record AircraftResponse(AircraftJson? Aircraft);

    private record AircraftJson(
        string? Type,
        [property: JsonPropertyName("icao_type")] string? IcaoType,
        string? Manufacturer,
        string? Registration,
        [property: JsonPropertyName("registered_owner")] string? RegisteredOwner);

    private record RouteBody(RouteResponse? Response);

    private record RouteResponse([property: JsonPropertyName("flightroute")] RouteJson? FlightRoute);

    private record RouteJson(AirlineJson? Airline, AirportJson? Origin, AirportJson? Destination);

    private record AirlineJson(string? Name);

    private record AirportJson(
        string? Name,
        string? Municipality,
        [property: JsonPropertyName("iata_code")] string? IataCode,
        [property: JsonPropertyName("icao_code")] string? IcaoCode,
        double? Latitude,
        double? Longitude);
}
