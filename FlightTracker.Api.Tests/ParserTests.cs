using FlightTracker.Api.Sources.OpenSky;
using FlightTracker.Api.Sources.Readsb;

namespace FlightTracker.Api.Tests;

public class OpenSkyParserTests
{
    // Fields by index: icao24, callsign, country, time_position, last_contact, lon, lat, baro_altitude,
    // on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source, category
    private const string Sample = """
        {"time":1762720000,"states":[
         ["C07C7B","ACA123  ","Canada",1762719995,1762719999,-79.87,43.25,3048.0,false,128.6,271.5,-5.08,null,3100.0,"1234",false,0,4],
         ["a1b2c3","        ","United States",null,1762719990,-79.9,43.1,null,false,null,null,null,null,1000.0,null,false,0],
         ["c0ffee","WJA9","Canada",1762719995,1762719999,-79.93,43.17,null,true,0,90,null,null,null,null,false,0,0],
         ["dead01",null,"Canada",null,1762719999,null,null,1000,false,100,10,0,null,null,null,false,0,0]
        ]}
        """;

    [Fact]
    public void Keeps_planes_in_the_air_with_a_position()
    {
        var planes = OpenSkyParser.Parse(Sample);

        Assert.Equal(["c07c7b", "a1b2c3"], planes.Select(p => p.Icao24));
    }

    [Fact]
    public void Converts_units_and_cleans_the_callsign()
    {
        var plane = OpenSkyParser.Parse(Sample)[0];

        Assert.Equal("ACA123", plane.Callsign);
        Assert.Equal(10000, plane.AltitudeFt);
        Assert.Equal(250.0, plane.SpeedKts);
        Assert.Equal(271.5, plane.Heading);
        Assert.Equal(-1000, plane.VerticalRate);
        Assert.Equal(DateTimeOffset.FromUnixTimeSeconds(1762719995).UtcDateTime, plane.Time);
    }

    [Fact]
    public void Falls_back_to_gps_altitude_and_last_contact_time()
    {
        var plane = OpenSkyParser.Parse(Sample)[1];

        Assert.Null(plane.Callsign);
        Assert.Equal(3281, plane.AltitudeFt);
        Assert.Null(plane.SpeedKts);
        Assert.Equal(DateTimeOffset.FromUnixTimeSeconds(1762719990).UtcDateTime, plane.Time);
    }

    [Fact]
    public void No_states_means_no_planes()
    {
        Assert.Empty(OpenSkyParser.Parse("""{"time":1,"states":null}"""));
    }
}

public class ReadsbParserTests
{
    private const string Sample = """
        { "now": 1794263200.0, "messages": 5000, "aircraft": [
         {"hex":"c07c7b","flight":"ACA123  ","alt_baro":10000,"gs":250.0,"track":271.5,"baro_rate":-1000,"lat":43.25,"lon":-79.87,"seen_pos":2.5},
         {"hex":"c0ffee","flight":"        ","alt_geom":3000,"gs":120.0,"true_heading":90.0,"geom_rate":500,"lat":43.1,"lon":-79.9,"seen_pos":0.4},
         {"hex":"~2a0001","alt_baro":5000,"lat":43.2,"lon":-79.8,"seen_pos":1.0},
         {"hex":"c0a0a0","alt_baro":"ground","lat":43.17,"lon":-79.93,"seen_pos":1.0},
         {"hex":"c0b0b0","alt_baro":20000,"lat":43.3,"lon":-79.7,"seen_pos":75.0},
         {"hex":"c0c0c0","alt_baro":30000,"seen":1.0}
        ]}
        """;

    [Fact]
    public void Skips_non_icao_ground_stale_and_positionless_planes()
    {
        var planes = ReadsbParser.Parse(Sample);

        Assert.Equal(["c07c7b", "c0ffee"], planes.Select(p => p.Icao24));
    }

    [Fact]
    public void Reads_values_without_converting_units()
    {
        var plane = ReadsbParser.Parse(Sample)[0];

        Assert.Equal("ACA123", plane.Callsign);
        Assert.Equal(10000, plane.AltitudeFt);
        Assert.Equal(250.0, plane.SpeedKts);
        Assert.Equal(271.5, plane.Heading);
        Assert.Equal(-1000, plane.VerticalRate);
    }

    [Fact]
    public void Position_time_is_now_minus_seen_pos()
    {
        var plane = ReadsbParser.Parse(Sample)[0];

        Assert.Equal(DateTimeOffset.FromUnixTimeMilliseconds(1794263197500).UtcDateTime, plane.Time);
    }

    [Fact]
    public void Falls_back_to_gps_altitude_heading_and_rate()
    {
        var plane = ReadsbParser.Parse(Sample)[1];

        Assert.Null(plane.Callsign);
        Assert.Equal(3000, plane.AltitudeFt);
        Assert.Equal(90.0, plane.Heading);
        Assert.Equal(500, plane.VerticalRate);
    }

    [Fact]
    public void Snapshot_has_message_count_and_all_aircraft()
    {
        var snapshot = ReadsbParser.ParseSnapshot(Sample);

        Assert.Equal(5000, snapshot.Messages);
        Assert.Equal(6, snapshot.AircraftTracked);
        Assert.Equal(1794263200.0, snapshot.Now);
    }
}
