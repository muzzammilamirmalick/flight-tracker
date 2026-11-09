using System.Text.RegularExpressions;
using FlightTracker.Api.Services;
using Microsoft.AspNetCore.Http.HttpResults;

namespace FlightTracker.Api.Endpoints;

public static class PlaneEndpoints
{
    private const int DefaultOverheadLimit = 5;
    private const int MaxOverheadLimit = 50;
    private const int DefaultHistoryHours = 24;
    private const int MaxHistoryHours = 30 * 24; // Sightings are only kept for 30 days.

    private static readonly Regex Icao24Pattern = new("^[0-9a-fA-F]{6}$", RegexOptions.Compiled);

    public static void MapPlaneEndpoints(this IEndpointRouteBuilder app)
    {
        var planes = app.MapGroup("/api/planes");

        planes.MapGet("/live", GetLive).WithName("GetLivePlanes");
        planes.MapGet("/overhead", GetOverhead).WithName("GetOverheadPlanes");
        planes.MapGet("/{icao24}/history", GetHistory).WithName("GetPlaneHistory");
    }

    private static async Task<Ok<List<LivePlaneDto>>> GetLive(PlaneQueries queries, CancellationToken cancellationToken)
    {
        return TypedResults.Ok(await queries.GetLivePlanesAsync(cancellationToken));
    }

    private static async Task<Results<Ok<List<OverheadPlaneDto>>, ValidationProblem>> GetOverhead(
        int? limit, PlaneQueries queries, CancellationToken cancellationToken)
    {
        var count = limit ?? DefaultOverheadLimit;
        if (count < 1 || count > MaxOverheadLimit)
        {
            return ValidationError("limit", $"limit must be between 1 and {MaxOverheadLimit}.");
        }

        return TypedResults.Ok(await queries.GetOverheadAsync(count, cancellationToken));
    }

    private static async Task<Results<Ok<PlaneHistoryDto>, ValidationProblem, NotFound>> GetHistory(
        string icao24, int? hours, PlaneQueries queries, CancellationToken cancellationToken)
    {
        if (!Icao24Pattern.IsMatch(icao24))
        {
            return ValidationError("icao24", "icao24 must be 6 hex characters, like c07c7b.");
        }

        var hoursBack = hours ?? DefaultHistoryHours;
        if (hoursBack < 1 || hoursBack > MaxHistoryHours)
        {
            return ValidationError("hours", $"hours must be between 1 and {MaxHistoryHours}.");
        }

        var history = await queries.GetHistoryAsync(icao24.ToLowerInvariant(), hoursBack, cancellationToken);
        if (history is null)
        {
            return TypedResults.NotFound();
        }

        return TypedResults.Ok(history);
    }

    private static ValidationProblem ValidationError(string field, string message) =>
        TypedResults.ValidationProblem(new Dictionary<string, string[]> { [field] = [message] });
}
