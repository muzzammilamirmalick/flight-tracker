using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlightTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAircraftDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "details_looked_up_at",
                table: "aircraft",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "manufacturer",
                table: "aircraft",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "model",
                table: "aircraft",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "details_looked_up_at",
                table: "aircraft");

            migrationBuilder.DropColumn(
                name: "manufacturer",
                table: "aircraft");

            migrationBuilder.DropColumn(
                name: "model",
                table: "aircraft");
        }
    }
}
