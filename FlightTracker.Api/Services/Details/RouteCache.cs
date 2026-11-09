using System.Collections.Concurrent;

namespace FlightTracker.Api.Services.Details;

// Remembers flight routes by callsign, in memory only.
// adsbdb's route data may not be copied into other databases, so we never save it to PostgreSQL.
public class RouteCache(TimeProvider clock)
{
    private static readonly TimeSpan KeepFor = TimeSpan.FromHours(12);

    private readonly ConcurrentDictionary<string, CachedRoute> _routes = new();

    // True if we already asked about this callsign recently. route is null when adsbdb did not know it.
    public bool TryGet(string callsign, out FlightRoute? route)
    {
        if (_routes.TryGetValue(callsign, out var cached) && clock.GetUtcNow() - cached.SavedAt < KeepFor)
        {
            route = cached.Route;
            return true;
        }

        route = null;
        return false;
    }

    public void Save(string callsign, FlightRoute? route)
    {
        _routes[callsign] = new CachedRoute(route, clock.GetUtcNow());
    }

    private record CachedRoute(FlightRoute? Route, DateTimeOffset SavedAt);
}
