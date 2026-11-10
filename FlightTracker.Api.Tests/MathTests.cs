using FlightTracker.Api.Services;
using FlightTracker.Api.Sources;

namespace FlightTracker.Api.Tests;

public class HaversineTests
{
    [Fact]
    public void Same_point_is_zero_km_apart()
    {
        Assert.Equal(0, Haversine.DistanceKm(43.25, -79.87, 43.25, -79.87), precision: 6);
    }

    [Fact]
    public void One_degree_of_latitude_is_about_111_km()
    {
        Assert.Equal(111.19, Haversine.DistanceKm(43, -79.87, 44, -79.87), precision: 1);
    }

    [Fact]
    public void Hamilton_to_Toronto_Pearson_is_about_52_km()
    {
        var km = Haversine.DistanceKm(43.25, -79.87, 43.6777, -79.6248);
        Assert.InRange(km, 51, 53);
    }

    [Fact]
    public void Distance_is_the_same_both_ways()
    {
        var there = Haversine.DistanceKm(43.25, -79.87, 45.5, -73.6);
        var back = Haversine.DistanceKm(45.5, -73.6, 43.25, -79.87);
        Assert.Equal(there, back, precision: 9);
    }
}

public class UnitConverterTests
{
    [Theory]
    [InlineData(0, 0)]
    [InlineData(3048, 10000)]
    [InlineData(10668, 35000)]
    public void Meters_to_feet(double meters, int feet)
    {
        Assert.Equal(feet, UnitConverter.MetersToFeet(meters));
    }

    [Fact]
    public void Meters_per_second_to_knots()
    {
        Assert.Equal(250.0, UnitConverter.MetersPerSecondToKnots(128.6));
    }

    [Theory]
    [InlineData(5.08, 1000)]
    [InlineData(-5.08, -1000)]
    public void Meters_per_second_to_feet_per_minute(double metersPerSecond, int feetPerMinute)
    {
        Assert.Equal(feetPerMinute, UnitConverter.MetersPerSecondToFeetPerMinute(metersPerSecond));
    }
}

public class AirlineCodeTests
{
    [Theory]
    [InlineData("ACA123", "ACA")]
    [InlineData("WJA4", "WJA")]
    [InlineData("CGABC", null)]
    [InlineData("N700RH", null)]
    public void Airline_code_comes_from_the_callsign(string callsign, string? expected)
    {
        Assert.Equal(expected, StatsService.GetAirlineCode(callsign));
    }
}
