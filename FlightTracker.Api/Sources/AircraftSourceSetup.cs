using FlightTracker.Api.Sources.OpenSky;

namespace FlightTracker.Api.Sources;

public static class AircraftSourceSetup
{
    // Registers the source named by the "AircraftSource" setting.
    public static void AddAircraftSource(this IServiceCollection services, IConfiguration configuration)
    {
        var sourceName = configuration["AircraftSource"] ?? "OpenSky";

        switch (sourceName)
        {
            case "OpenSky":
                AddOpenSky(services, configuration);
                break;
            default:
                throw new InvalidOperationException($"Unknown AircraftSource '{sourceName}'. Use 'OpenSky'.");
        }
    }

    private static void AddOpenSky(IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<OpenSkyOptions>()
            .Bind(configuration.GetSection("OpenSky"))
            .Validate(o => !string.IsNullOrWhiteSpace(o.ClientId) && !string.IsNullOrWhiteSpace(o.ClientSecret),
                "OpenSky:ClientId and OpenSky:ClientSecret must be set (user-secrets or environment variables).")
            .ValidateOnStart();

        services.AddHttpClient(OpenSkyTokenService.HttpClientName, client => client.Timeout = TimeSpan.FromSeconds(20));
        services.AddSingleton<OpenSkyTokenService>();

        services.AddHttpClient<IAircraftSource, OpenSkySource>(client => client.Timeout = TimeSpan.FromSeconds(20));
    }
}
