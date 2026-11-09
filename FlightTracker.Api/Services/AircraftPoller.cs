using FlightTracker.Api.Sources;
using Microsoft.Extensions.Options;

namespace FlightTracker.Api.Services;

public class PollerOptions
{
    public int IntervalSeconds { get; set; } = 30;
}

// Asks the aircraft source for planes on a timer and saves what it gets.
public class AircraftPoller(
    IServiceScopeFactory scopeFactory,
    IOptions<PollerOptions> options,
    ILogger<AircraftPoller> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(options.Value.IntervalSeconds);
        logger.LogInformation("Polling for aircraft every {Seconds} seconds", interval.TotalSeconds);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await PollOnceAsync(stoppingToken);
                await Task.Delay(interval, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // The app is shutting down while we wait for the next poll.
        }
    }

    private async Task PollOnceAsync(CancellationToken stoppingToken)
    {
        try
        {
            // A new scope each time so we get a fresh DbContext.
            using var scope = scopeFactory.CreateScope();
            var source = scope.ServiceProvider.GetRequiredService<IAircraftSource>();
            var saver = scope.ServiceProvider.GetRequiredService<SightingSaver>();

            var planes = await source.GetAircraftAsync(stoppingToken);
            var saved = await saver.SaveAsync(planes, stoppingToken);

            logger.LogInformation("Got {Planes} planes, saved {Saved} new sightings", planes.Count, saved);
        }
        catch (Exception) when (stoppingToken.IsCancellationRequested)
        {
            // Shutdown started in the middle of a poll. The HTTP client or database can throw
            // different exception types when that happens, so treat any of them as a normal stop.
        }
        catch (Exception ex)
        {
            // A real failure. Log it and try again next interval.
            logger.LogError(ex, "Polling for aircraft failed, will try again next interval");
        }
    }
}
