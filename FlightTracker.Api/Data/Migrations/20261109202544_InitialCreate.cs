using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FlightTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "aircraft",
                columns: table => new
                {
                    icao24 = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: false),
                    callsign = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    registration = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    type_code = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    @operator = table.Column<string>(name: "operator", type: "character varying(100)", maxLength: 100, nullable: true),
                    first_seen = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_seen = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_aircraft", x => x.icao24);
                });

            migrationBuilder.CreateTable(
                name: "sightings",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    icao24 = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: false),
                    time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    latitude = table.Column<double>(type: "double precision", nullable: false),
                    longitude = table.Column<double>(type: "double precision", nullable: false),
                    altitude_ft = table.Column<int>(type: "integer", nullable: true),
                    speed_kts = table.Column<double>(type: "double precision", nullable: true),
                    heading = table.Column<double>(type: "double precision", nullable: true),
                    vertical_rate = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_sightings", x => x.id);
                    table.ForeignKey(
                        name: "fk_sightings_aircraft_icao24",
                        column: x => x.icao24,
                        principalTable: "aircraft",
                        principalColumn: "icao24",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_aircraft_last_seen",
                table: "aircraft",
                column: "last_seen");

            migrationBuilder.CreateIndex(
                name: "ix_sightings_icao24_time",
                table: "sightings",
                columns: new[] { "icao24", "time" });

            migrationBuilder.CreateIndex(
                name: "ix_sightings_time",
                table: "sightings",
                column: "time");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sightings");

            migrationBuilder.DropTable(
                name: "aircraft");
        }
    }
}
