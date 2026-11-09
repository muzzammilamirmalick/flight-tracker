using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;

namespace FlightTracker.Api.Sources.OpenSky;

public class OpenSkySource(
    HttpClient httpClient,
    OpenSkyTokenService tokenService,
    IOptions<OpenSkyOptions> options,
    ILogger<OpenSkySource> logger) : IAircraftSource
{
    public async Task<IReadOnlyList<AircraftState>> GetAircraftAsync(CancellationToken cancellationToken)
    {
        var response = await SendStatesRequestAsync(cancellationToken);

        // The token may have expired early. Get a new one and try once more.
        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            response.Dispose();
            tokenService.ClearToken();
            response = await SendStatesRequestAsync(cancellationToken);
        }

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var retryAfter = GetHeader(response, "X-Rate-Limit-Retry-After-Seconds") ?? "unknown";
                logger.LogWarning("Out of OpenSky credits. Retry after {Seconds} seconds", retryAfter);
                return [];
            }

            response.EnsureSuccessStatusCode();

            var creditsLeft = GetHeader(response, "X-Rate-Limit-Remaining");
            logger.LogDebug("OpenSky credits left today: {Credits}", creditsLeft);

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            return OpenSkyParser.Parse(json);
        }
    }

    private async Task<HttpResponseMessage> SendStatesRequestAsync(CancellationToken cancellationToken)
    {
        var token = await tokenService.GetTokenAsync(cancellationToken);

        using var request = new HttpRequestMessage(HttpMethod.Get, BuildStatesUrl());
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return await httpClient.SendAsync(request, cancellationToken);
    }

    private string BuildStatesUrl()
    {
        var o = options.Value;

        // Invariant so the decimals always use a dot, whatever the server's culture is.
        return FormattableString.Invariant(
            $"{o.ApiUrl}/states/all?lamin={o.LatMin}&lomin={o.LonMin}&lamax={o.LatMax}&lomax={o.LonMax}");
    }

    private static string? GetHeader(HttpResponseMessage response, string name) =>
        response.Headers.TryGetValues(name, out var values) ? values.FirstOrDefault() : null;
}
