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
    private static readonly TimeSpan RunEvery = TimeSpan.FromDays(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await CleanUpOnceAsync(stoppingToken);
                await Task.Delay(RunEvery, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // The app is shutting down while we wait for the next cleanup.
        }
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
        catch (Exception) when (stoppingToken.IsCancellationRequested)
        {
            // Shutdown started in the middle of a cleanup. Treat it as a normal stop.
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Sighting cleanup failed, will try again tomorrow");
        }
    }
}
