using FlightTracker.Api.Services;
using Microsoft.AspNetCore.Http.HttpResults;

namespace FlightTracker.Api.Endpoints;

public static class ReceiverEndpoints
{
    public static void MapReceiverEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/receiver", GetReceiverStatus).WithName("GetReceiverStatus");
    }

    private static Ok<ReceiverStatusDto> GetReceiverStatus(ReceiverStatusTracker tracker)
    {
        return TypedResults.Ok(tracker.GetStatus());
    }
}
