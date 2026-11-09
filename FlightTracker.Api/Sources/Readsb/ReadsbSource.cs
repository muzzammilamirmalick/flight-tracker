using FlightTracker.Api.Services;
using Microsoft.Extensions.Options;

namespace FlightTracker.Api.Sources.Readsb;

// Reads planes from our own ADS-B receiver on the Raspberry Pi.
public class ReadsbSource(HttpClient httpClient, IOptions<ReadsbOptions> options, ReceiverStatusTracker status) : IAircraftSource
{
    public async Task<IReadOnlyList<AircraftState>> GetAircraftAsync(CancellationToken cancellationToken)
    {
        var json = await httpClient.GetStringAsync(options.Value.Url, cancellationToken);
        var snapshot = ReadsbParser.ParseSnapshot(json);

        // Also report how busy the receiver is, for the status chip.
        status.RecordReadsb(snapshot.Now, snapshot.Messages, snapshot.AircraftTracked);
        return snapshot.Planes;
    }
}
