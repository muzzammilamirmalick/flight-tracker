namespace FlightTracker.Api.Sources;

public static class UnitConverter
{
    private const double FeetPerMeter = 3.28084;
    private const double KnotsPerMeterPerSecond = 1.943844;
    private const double SecondsPerMinute = 60;

    public static int MetersToFeet(double meters) =>
        (int)Math.Round(meters * FeetPerMeter);

    public static double MetersPerSecondToKnots(double metersPerSecond) =>
        Math.Round(metersPerSecond * KnotsPerMeterPerSecond, 1);

    public static int MetersPerSecondToFeetPerMinute(double metersPerSecond) =>
        (int)Math.Round(metersPerSecond * FeetPerMeter * SecondsPerMinute);
}
