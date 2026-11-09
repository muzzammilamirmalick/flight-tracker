using FlightTracker.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace FlightTracker.Api.Services.Details;

// Every so often, looks up type, registration and owner for planes we have not asked about yet,
// and the route for callsigns that are flying right now.
// If adsbdb is down we log a warning and try again next round. The rest of the app keeps working.
public class AircraftDetailsLookup(
    IServiceScopeFactory scopeFactory,
    RouteCache routeCache,
    TimeProvider clock,
    ILogger<AircraftDetailsLookup> logger) : BackgroundService
{
    private static readonly TimeSpan RunEvery = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan RecentlySeen = TimeSpan.FromMinutes(10);

    // Small batches so we stay polite to a free service.
    private const int MaxLookupsPerRound = 10;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await LookUpOnceAsync(stoppingToken);
                await Task.Delay(RunEvery, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // The app is shutting down.
        }
    }

    private async Task LookUpOnceAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FlightTrackerDbContext>();
            var adsbdb = scope.ServiceProvider.GetRequiredService<AdsbdbClient>();

            await LookUpAircraftAsync(db, adsbdb, stoppingToken);
            await LookUpRoutesAsync(db, adsbdb, stoppingToken);
        }
        catch (Exception) when (stoppingToken.IsCancellationRequested)
        {
            // Shutdown started in the middle of a lookup.
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning("adsbdb lookup failed ({Message}), will try again later", ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Aircraft details lookup failed, will try again later");
        }
    }

    private async Task LookUpAircraftAsync(FlightTrackerDbContext db, AdsbdbClient adsbdb, CancellationToken stoppingToken)
    {
        var since = clock.GetUtcNow().UtcDateTime - RecentlySeen;
        var planes = await db.Aircraft
            .Where(a => a.DetailsLookedUpAt == null && a.LastSeen >= since)
            .OrderByDescending(a => a.LastSeen)
            .Take(MaxLookupsPerRound)
            .ToListAsync(stoppingToken);

        foreach (var plane in planes)
        {
            var details = await adsbdb.GetAircraftAsync(plane.Icao24, stoppingToken);
            if (details is not null)
            {
                plane.Registration = details.Registration;
                plane.TypeCode = details.TypeCode;
                plane.Manufacturer = details.Manufacturer;
                plane.Model = details.Model;
                plane.Operator = details.Operator;
            }

            // Mark it even when adsbdb did not know it, so we only ask once.
            plane.DetailsLookedUpAt = clock.GetUtcNow().UtcDateTime;

            // Save after each plane so one failure does not lose the others.
            await db.SaveChangesAsync(stoppingToken);
        }

        if (planes.Count > 0)
        {
            logger.LogInformation("Looked up details for {Count} planes", planes.Count);
        }
    }

    private async Task LookUpRoutesAsync(FlightTrackerDbContext db, AdsbdbClient adsbdb, CancellationToken stoppingToken)
    {
        var since = clock.GetUtcNow().UtcDateTime - PlaneQueries.LiveWindow;
        var callsigns = await db.Aircraft
            .Where(a => a.LastSeen >= since && a.Callsign != null)
            .Select(a => a.Callsign!)
            .Distinct()
            .ToListAsync(stoppingToken);

        var newCallsigns = callsigns
            .Where(callsign => !routeCache.TryGet(callsign, out _))
            .Take(MaxLookupsPerRound);

        foreach (var callsign in newCallsigns)
        {
            var route = await adsbdb.GetRouteAsync(callsign, stoppingToken);
            routeCache.Save(callsign, route);
        }
    }
}
