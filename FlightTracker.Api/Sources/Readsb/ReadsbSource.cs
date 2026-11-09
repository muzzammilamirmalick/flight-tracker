using Microsoft.Extensions.Options;

namespace FlightTracker.Api.Sources.Readsb;

// Reads planes from our own ADS-B receiver on the Raspberry Pi.
public class ReadsbSource(HttpClient httpClient, IOptions<ReadsbOptions> options) : IAircraftSource
{
    public async Task<IReadOnlyList<AircraftState>> GetAircraftAsync(CancellationToken cancellationToken)
    {
        var json = await httpClient.GetStringAsync(options.Value.Url, cancellationToken);
        return ReadsbParser.Parse(json);
    }
}
