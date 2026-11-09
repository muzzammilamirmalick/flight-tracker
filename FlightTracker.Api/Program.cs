using FlightTracker.Api.Data;
using FlightTracker.Api.Endpoints;
using FlightTracker.Api.Services;
using FlightTracker.Api.Services.Details;
using FlightTracker.Api.Sources;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Database. The connection string comes from user-secrets on the PC and an environment variable on the Pi.
var connectionString = builder.Configuration.GetConnectionString("FlightTracker")
    ?? throw new InvalidOperationException("Connection string 'FlightTracker' is not set.");

builder.Services.AddDbContext<FlightTrackerDbContext>(options =>
    options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

// Where plane data comes from (the Pi receiver or OpenSky) and the background jobs that collect it.
// AddAircraftSource also sets the poll interval for the chosen source.
builder.Services.AddAircraftSource(builder.Configuration);
builder.Services.AddScoped<SightingSaver>();
builder.Services.AddHostedService<AircraftPoller>();

builder.Services.Configure<CleanupOptions>(builder.Configuration.GetSection("Cleanup"));
builder.Services.AddHostedService<SightingCleanup>();

// Reading data back out for the endpoints.
builder.Services.AddOptions<HomeOptions>()
    .Bind(builder.Configuration.GetSection("Home"))
    .Validate(o => TimeZoneInfo.TryFindSystemTimeZoneById(o.TimeZone, out _), "Home:TimeZone is not a known time zone.")
    .ValidateOnStart();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<PlaneQueries>();
builder.Services.AddScoped<StatsService>();
builder.Services.AddProblemDetails();

// Plane type, registration and route from adsbdb.com, filled in the background.
builder.Services.AddHttpClient<AdsbdbClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Adsbdb:BaseUrl"] ?? "https://api.adsbdb.com/v0/");
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("FlightTracker/1.0");
});
builder.Services.AddSingleton<RouteCache>();
builder.Services.AddHostedService<AircraftDetailsLookup>();

// Let the React app call the API from its own address (the Vite dev server on the PC).
const string WebAppCors = "WebApp";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
    options.AddPolicy(WebAppCors, policy => policy.WithOrigins(allowedOrigins).AllowAnyHeader().WithMethods("GET")));

builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(WebAppCors);

// No HTTPS redirect: the API only runs over plain http on my home network.

// Unexpected errors become a 500 problem response. Bad input that ASP.NET could not bind
// (like ?limit=abc) keeps its own 400 status instead.
app.UseExceptionHandler(new ExceptionHandlerOptions
{
    StatusCodeSelector = exception => exception is BadHttpRequestException badRequest
        ? badRequest.StatusCode
        : StatusCodes.Status500InternalServerError,
});

// Give empty error responses (like a 404) the same problem JSON body as the others.
app.UseStatusCodePages();

app.MapGet("/api/health", () => new HealthResponse("Flight tracker is running", DateTimeOffset.UtcNow))
    .WithName("GetHealth");
app.MapPlaneEndpoints();
app.MapStatsEndpoints();

app.Run();

record HealthResponse(string Status, DateTimeOffset ServerTime);
