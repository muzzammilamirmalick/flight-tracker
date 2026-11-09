using FlightTracker.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FlightTracker.Api.Services;

public class CleanupOptions
{
    public int KeepDays { get; set; } = 30;
}

// Once a day, deletes sightings older than KeepDays so the database does not grow forever.
public class SightingCleanup(
    IServiceScopeFactory scopeFactory,
    IOptions<CleanupOptions> options,
    ILogger<SightingCleanup> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromDays(1));
        do
        {
            await CleanUpOnceAsync(stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task CleanUpOnceAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FlightTrackerDbContext>();

            var cutoff = DateTime.UtcNow.AddDays(-options.Value.KeepDays);
            var deleted = await db.Sightings
                .Where(s => s.Time < cutoff)
                .ExecuteDeleteAsync(stoppingToken);

            logger.LogInformation("Deleted {Count} sightings older than {Days} days", deleted, options.Value.KeepDays);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // The app is shutting down.
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Sighting cleanup failed, will try again tomorrow");
        }
    }
}
