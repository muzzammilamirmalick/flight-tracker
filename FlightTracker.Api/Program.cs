using FlightTracker.Api.Data;
using FlightTracker.Api.Services;
using FlightTracker.Api.Sources;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Database. The connection string comes from user-secrets on the PC and an environment variable on the Pi.
var connectionString = builder.Configuration.GetConnectionString("FlightTracker")
    ?? throw new InvalidOperationException("Connection string 'FlightTracker' is not set.");

builder.Services.AddDbContext<FlightTrackerDbContext>(options =>
    options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

// Where plane data comes from (OpenSky for now) and the background jobs that collect it.
builder.Services.AddAircraftSource(builder.Configuration);
builder.Services.AddScoped<SightingSaver>();

builder.Services.AddOptions<PollerOptions>()
    .Bind(builder.Configuration.GetSection("Poller"))
    .Validate(o => o.IntervalSeconds >= 10, "Poller:IntervalSeconds must be at least 10.")
    .ValidateOnStart();
builder.Services.AddHostedService<AircraftPoller>();

builder.Services.Configure<CleanupOptions>(builder.Configuration.GetSection("Cleanup"));
builder.Services.AddHostedService<SightingCleanup>();

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
