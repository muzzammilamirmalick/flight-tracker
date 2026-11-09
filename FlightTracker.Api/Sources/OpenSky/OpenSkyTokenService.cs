using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace FlightTracker.Api.Sources.OpenSky;

// Gets an OAuth2 token from OpenSky and reuses it until it is about to expire.
// Registered as a singleton so every request shares the same cached token.
public class OpenSkyTokenService(
    IHttpClientFactory httpClientFactory,
    IOptions<OpenSkyOptions> options,
    ILogger<OpenSkyTokenService> logger)
{
    public const string HttpClientName = "OpenSkyAuth";

    // Get a new token a minute early so we never send one that expires mid-request.
    private static readonly TimeSpan RefreshEarly = TimeSpan.FromMinutes(1);

    private readonly SemaphoreSlim _lock = new(1, 1);
    private string? _token;
    private DateTime _expiresAt;

    public async Task<string> GetTokenAsync(CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_token is null || DateTime.UtcNow >= _expiresAt)
            {
                await RequestNewTokenAsync(cancellationToken);
            }

            return _token!;
        }
        finally
        {
            _lock.Release();
        }
    }

    // Called when OpenSky rejects the token, so the next call fetches a fresh one.
    public void ClearToken()
    {
        _token = null;
    }

    private async Task RequestNewTokenAsync(CancellationToken cancellationToken)
    {
        var settings = options.Value;
        var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = settings.ClientId,
            ["client_secret"] = settings.ClientSecret,
        });

        var client = httpClientFactory.CreateClient(HttpClientName);
        using var response = await client.PostAsync(settings.TokenUrl, form, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"OpenSky token request failed with status {(int)response.StatusCode}. " +
                "Check OpenSky:ClientId and OpenSky:ClientSecret.");
        }

        var tokenResponse = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken)
            ?? throw new HttpRequestException("OpenSky token response was empty.");

        // OpenSky tokens last 30 minutes. Use that if the response leaves it out.
        var lifetime = TimeSpan.FromSeconds(tokenResponse.ExpiresIn > 0 ? tokenResponse.ExpiresIn : 1800);

        _token = tokenResponse.AccessToken;
        _expiresAt = DateTime.UtcNow + lifetime - RefreshEarly;

        logger.LogInformation("Got a new OpenSky token, valid for {Minutes} minutes", (int)lifetime.TotalMinutes);
    }

    private record TokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn);
}
