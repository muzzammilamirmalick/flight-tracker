using FlightTracker.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Comes from user-secrets on the PC and an environment variable on the Pi.
var connectionString = builder.Configuration.GetConnectionString("FlightTracker")
    ?? throw new InvalidOperationException("Connection string 'FlightTracker' is not set.");

builder.Services.AddDbContext<FlightTrackerDbContext>(options =>
    options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapGet("/api/health", () => new HealthResponse("Flight tracker is running", DateTimeOffset.UtcNow))
    .WithName("GetHealth");

app.Run();

record HealthResponse(string Status, DateTimeOffset ServerTime);
