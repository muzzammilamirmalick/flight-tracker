using FlightTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FlightTracker.Api.Data;

public class FlightTrackerDbContext(DbContextOptions<FlightTrackerDbContext> options) : DbContext(options)
{
    public DbSet<Aircraft> Aircraft => Set<Aircraft>();
    public DbSet<Sighting> Sightings => Set<Sighting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Aircraft>(aircraft =>
        {
            aircraft.HasKey(a => a.Icao24);
            aircraft.Property(a => a.Icao24).HasMaxLength(6);
            aircraft.Property(a => a.Callsign).HasMaxLength(8);
            aircraft.Property(a => a.Registration).HasMaxLength(16);
            aircraft.Property(a => a.TypeCode).HasMaxLength(8);
            aircraft.Property(a => a.Operator).HasMaxLength(100);
            aircraft.HasIndex(a => a.LastSeen);
        });

        modelBuilder.Entity<Sighting>(sighting =>
        {
            sighting.Property(s => s.Icao24).HasMaxLength(6);

            sighting.HasOne(s => s.Aircraft)
                .WithMany(a => a.Sightings)
                .HasForeignKey(s => s.Icao24);

            // Used for one plane's path and for "recent sightings" queries.
            sighting.HasIndex(s => new { s.Icao24, s.Time });
            sighting.HasIndex(s => s.Time);
        });
    }
}
