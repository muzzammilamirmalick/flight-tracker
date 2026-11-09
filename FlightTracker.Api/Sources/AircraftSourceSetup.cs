using FlightTracker.Api.Services;
using FlightTracker.Api.Sources.OpenSky;
using FlightTracker.Api.Sources.Readsb;

namespace FlightTracker.Api.Sources;

public static class AircraftSourceSetup
{
    // OpenSky's standard account gets 4000 credits a day and our box costs 1 credit per call.
    // 86400 seconds / 4000 calls is about 22 seconds, so never poll faster than that.
    private const int OpenSkyMinIntervalSeconds = 22;

    // Registers the source named by the "AircraftSource" setting ("Readsb" or "OpenSky")
    // and sets the poll interval from that source's settings.
    public static void AddAircraftSource(this IServiceCollection services, IConfiguration configuration)
    {
        var sourceName = configuration["AircraftSource"] ?? "Readsb";
        services.AddSingleton(provider => new ReceiverStatusTracker(sourceName, provider.GetRequiredService<TimeProvider>()));

        switch (sourceName)
        {
            case "Readsb":
                AddReadsb(services, configuration);
                break;
            case "OpenSky":
                AddOpenSky(services, configuration);
                break;
            default:
                throw new InvalidOperationException($"Unknown AircraftSource '{sourceName}'. Use 'Readsb' or 'OpenSky'.");
        }
    }

    private static void AddReadsb(IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection("Readsb");

        services.AddOptions<ReadsbOptions>()
            .Bind(section)
            .Validate(o => Uri.TryCreate(o.Url, UriKind.Absolute, out _), "Readsb:Url must be a full URL.")
            .Validate(o => o.PollIntervalSeconds >= 1, "Readsb:PollIntervalSeconds must be at least 1.")
            .ValidateOnStart();

        services.Configure<PollerOptions>(o => o.IntervalSeconds = section.GetValue("PollIntervalSeconds", 10));

        services.AddHttpClient<IAircraftSource, ReadsbSource>(client => client.Timeout = TimeSpan.FromSeconds(10));
    }

    private static void AddOpenSky(IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection("OpenSky");

        services.AddOptions<OpenSkyOptions>()
            .Bind(section)
            .Validate(o => !string.IsNullOrWhiteSpace(o.ClientId) && !string.IsNullOrWhiteSpace(o.ClientSecret),
                "OpenSky:ClientId and OpenSky:ClientSecret must be set (user-secrets or environment variables).")
            .Validate(o => o.PollIntervalSeconds >= OpenSkyMinIntervalSeconds,
                $"OpenSky:PollIntervalSeconds must be at least {OpenSkyMinIntervalSeconds} to stay under the daily credit limit.")
            .ValidateOnStart();

        services.Configure<PollerOptions>(o => o.IntervalSeconds = section.GetValue("PollIntervalSeconds", 30));

        services.AddHttpClient(OpenSkyTokenService.HttpClientName, client => client.Timeout = TimeSpan.FromSeconds(20));
        services.AddSingleton<OpenSkyTokenService>();

        services.AddHttpClient<IAircraftSource, OpenSkySource>(client => client.Timeout = TimeSpan.FromSeconds(20));
    }
}
