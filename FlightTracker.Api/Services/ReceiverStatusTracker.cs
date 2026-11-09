namespace FlightTracker.Api.Services;

public record ReceiverStatusDto(
    string Source,
    bool Online,
    DateTime? LastUpdate,
    double? MessagesPerSecond,
    int? AircraftTracked,
    int PlanesWithPosition);

// Keeps track of how the receiver (or OpenSky) is doing, for the status chip in the web app.
// The poller and the readsb source report to it. It is a singleton, so it uses a lock.
public class ReceiverStatusTracker(string sourceName, TimeProvider clock)
{
    // If we have not had good data for this long, the receiver counts as offline.
    private static readonly TimeSpan OfflineAfter = TimeSpan.FromSeconds(60);

    private readonly Lock _lock = new();
    private DateTime? _lastSuccess;
    private int _planesWithPosition;
    private int? _aircraftTracked;
    private double? _messagesPerSecond;

    // The last readsb counter reading, to work out the message rate from the next one.
    private double? _lastReadsbTime;
    private long? _lastReadsbMessages;

    public void RecordPoll(int planesWithPosition)
    {
        lock (_lock)
        {
            _lastSuccess = clock.GetUtcNow().UtcDateTime;
            _planesWithPosition = planesWithPosition;
        }
    }

    // readsb reports a running total of messages since it started. The rate is the change between two readings.
    public void RecordReadsb(double fileTimeSeconds, long? totalMessages, int aircraftTracked)
    {
        lock (_lock)
        {
            _aircraftTracked = aircraftTracked;

            if (totalMessages is not null && _lastReadsbTime is not null && _lastReadsbMessages is not null &&
                fileTimeSeconds > _lastReadsbTime && totalMessages >= _lastReadsbMessages)
            {
                var rate = (totalMessages.Value - _lastReadsbMessages.Value) / (fileTimeSeconds - _lastReadsbTime.Value);
                _messagesPerSecond = Math.Round(rate, 1);
            }

            _lastReadsbTime = fileTimeSeconds;
            _lastReadsbMessages = totalMessages;
        }
    }

    public ReceiverStatusDto GetStatus()
    {
        lock (_lock)
        {
            var online = _lastSuccess is not null && clock.GetUtcNow().UtcDateTime - _lastSuccess < OfflineAfter;
            return new ReceiverStatusDto(
                sourceName,
                online,
                _lastSuccess,
                online ? _messagesPerSecond : null,
                _aircraftTracked,
                online ? _planesWithPosition : 0);
        }
    }
}
