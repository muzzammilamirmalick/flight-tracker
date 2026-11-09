using FlightTracker.Api.Services;
using Microsoft.AspNetCore.Http.HttpResults;

namespace FlightTracker.Api.Endpoints;

public static class StatsEndpoints
{
    public static void MapStatsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/stats", GetStats).WithName("GetStats");
    }

    private static async Task<Ok<StatsDto>> GetStats(StatsService stats, CancellationToken cancellationToken)
    {
        return TypedResults.Ok(await stats.GetTodayAsync(cancellationToken));
    }
}
