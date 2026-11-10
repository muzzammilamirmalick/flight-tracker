# Builds everything the Pi needs into the "publish" folder:
#   publish/api         the API for linux-arm64, with the React app inside wwwroot
#   publish/schema.sql  the database tables, safe to run more than once
# Run it from the repo root on the PC:  .\deploy\publish.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$output = Join-Path $root "publish"

Write-Host "Cleaning $output"
if (Test-Path $output) { Remove-Item $output -Recurse -Force }

Write-Host "Building the web app"
Push-Location (Join-Path $root "web")
# "npm install" instead of "npm ci", so this also works while "npm run dev" is running.
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "web build failed" }
Pop-Location

Write-Host "Publishing the API for the Pi (linux-arm64, uses the .NET 10 runtime installed on the Pi)"
dotnet publish (Join-Path $root "FlightTracker.Api") -c Release -r linux-arm64 --self-contained false -o (Join-Path $output "api")
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed" }

Write-Host "Copying the web app into wwwroot"
Copy-Item (Join-Path $root "web\dist") (Join-Path $output "api\wwwroot") -Recurse

Write-Host "Writing the database script"
Push-Location (Join-Path $root "FlightTracker.Api")
# The EF tools need a connection string to start, but this command never connects to a database.
$env:ConnectionStrings__FlightTracker = "Host=localhost;Database=flighttracker"
dotnet ef migrations script --idempotent -o (Join-Path $output "schema.sql")
Remove-Item Env:ConnectionStrings__FlightTracker
if ($LASTEXITCODE -ne 0) { throw "migrations script failed" }
Pop-Location

Write-Host "Done. Copy the publish folder to the Pi (see docs/pi-deploy.md)."
