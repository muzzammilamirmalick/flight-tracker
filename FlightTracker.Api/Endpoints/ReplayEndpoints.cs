using FlightTracker.Api.Services;
using Microsoft.AspNetCore.Http.HttpResults;

namespace FlightTracker.Api.Endpoints;

public static class ReplayEndpoints
{
    // The web app asks for one hour at a time. Two hours is plenty and keeps responses small.
    private static readonly TimeSpan MaxRange = TimeSpan.FromHours(2);

    public static void MapReplayEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/replay", GetReplay).WithName("GetReplay");
    }

    private static async Task<Results<Ok<List<ReplayPointDto>>, ValidationProblem>> GetReplay(
        DateTimeOffset? from, DateTimeOffset? to, PlaneQueries queries, CancellationToken cancellationToken)
    {
        if (from is null || to is null)
        {
            return ValidationError("from", "from and to are both needed, for example ?from=2026-11-09T14:00:00Z&to=2026-11-09T15:00:00Z.");
        }

        if (to <= from)
        {
            return ValidationError("to", "to must be after from.");
        }

        if (to - from > MaxRange)
        {
            return ValidationError("to", $"The range can be at most {MaxRange.TotalHours} hours.");
        }

        var points = await queries.GetReplayAsync(from.Value.UtcDateTime, to.Value.UtcDateTime, cancellationToken);
        return TypedResults.Ok(points);
    }

    private static ValidationProblem ValidationError(string field, string message) =>
        TypedResults.ValidationProblem(new Dictionary<string, string[]> { [field] = [message] });
}
