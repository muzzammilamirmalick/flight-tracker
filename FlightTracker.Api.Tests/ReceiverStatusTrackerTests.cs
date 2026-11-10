using FlightTracker.Api.Services;
using Microsoft.Extensions.Time.Testing;

namespace FlightTracker.Api.Tests;

public class ReceiverStatusTrackerTests
{
    private readonly FakeTimeProvider _clock = new(ApiFactory.Now);

    [Fact]
    public void Offline_before_the_first_poll()
    {
        var status = new ReceiverStatusTracker("Readsb", _clock).GetStatus();

        Assert.False(status.Online);
        Assert.Equal("Readsb", status.Source);
    }

    [Fact]
    public void Message_rate_is_the_change_between_two_readings()
    {
        var tracker = new ReceiverStatusTracker("Readsb", _clock);

        tracker.RecordReadsb(fileTimeSeconds: 1000, totalMessages: 5000, aircraftTracked: 4);
        tracker.RecordReadsb(fileTimeSeconds: 1010, totalMessages: 5120, aircraftTracked: 5);
        tracker.RecordPoll(planesWithPosition: 3);

        var status = tracker.GetStatus();
        Assert.True(status.Online);
        Assert.Equal(12, status.MessagesPerSecond);
        Assert.Equal(5, status.AircraftTracked);
        Assert.Equal(3, status.PlanesWithPosition);
    }

    [Fact]
    public void Counter_reset_after_a_readsb_restart_is_ignored()
    {
        var tracker = new ReceiverStatusTracker("Readsb", _clock);

        tracker.RecordReadsb(1000, 5000, 4);
        tracker.RecordReadsb(1010, 5120, 4);
        tracker.RecordReadsb(1020, 30, 4); // readsb restarted, counter went back to 0
        tracker.RecordPoll(3);

        Assert.Equal(12, tracker.GetStatus().MessagesPerSecond);
    }

    [Fact]
    public void Goes_offline_a_minute_after_the_last_good_poll()
    {
        var tracker = new ReceiverStatusTracker("Readsb", _clock);
        tracker.RecordPoll(3);

        _clock.Advance(TimeSpan.FromSeconds(30));
        Assert.True(tracker.GetStatus().Online);

        _clock.Advance(TimeSpan.FromSeconds(31));
        var status = tracker.GetStatus();
        Assert.False(status.Online);
        Assert.Equal(0, status.PlanesWithPosition);
    }
}
