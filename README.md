# My Sky: a flight tracker for Hamilton

My Sky shows what is flying over my home in Hamilton, Ontario, using planes picked up by my own ADS-B receiver on a Raspberry Pi. It is made for a normal person standing outside: it tells you which way to look and how high, and what the plane is, in plain words.

![Replaying the 6 PM rush over Hamilton](docs/screenshots/desktop-replay.png)

*Replaying the 6 PM rush over Hamilton, from my own antenna.*

## What it does

- **Live map** of planes near Hamilton, colored by altitude, gliding smoothly between updates with fading trails.
- **Look Up card** for the closest plane: a compass direction, how many degrees above the horizon, and a sentence like "Look north-east, about 30 degrees up. Air Canada Boeing 737-8 heading to Montreal."
- **Plane details** in plain words when you tap a plane: airline, aircraft, altitude, speed, distance, direction and route (only when the route actually fits where the plane is going).
- **Split-flap board** with the 6 nearest planes.
- **Live sky background** that matches the real sky over Hamilton right now, from the sun position, with stars at night.
- **Day replay** of today's traffic at 1x, 10x or 60x.
- **"Today over Hamilton"**, the day's numbers told as a short story: planes today, the busiest hour on a 24 hour chart, top airlines, highest, fastest and lowest plane, and the first and latest plane of the day.
- **Aviation history**, a few famous flights drawn on the same dark map: the path with numbered key points, a timeline, what happened, the cause, what changed afterwards, an embedded documentary and the sources. See [Aviation history](#aviation-history) below.
- **Receiver status chip** showing it is live from my antenna, with the message rate and plane count.
- Works on phones (everything except the Look Up card moves into a swipe-up sheet), with the keyboard, and with reduced motion.

## Screenshots

| Desktop | Phone |
| --- | --- |
| ![Plane details on desktop](docs/screenshots/desktop-plane-details.png) | ![Phone](docs/screenshots/phone-live.png) |
| ![Today over Hamilton](docs/screenshots/desktop-today.png) | ![Phone with the board open](docs/screenshots/phone-board.png) |
| ![Live on a quiet evening](docs/screenshots/desktop-live.png) | ![Aviation history on a phone](docs/screenshots/phone-history.png) |
| ![Aviation history: Air Transat 236](docs/screenshots/desktop-history.png) | |

## Aviation history

The `#/history` page tells the story of a few well documented flights, in the factual way an accident report does: what happened, why, and what aviation changed because of it. No wreckage photos, and no "last words". Where a line from the record explains the cause, it is quoted once with its source.

| Flight | Date | Main source |
| --- | --- | --- |
| Aloha Airlines 243 | 28 April 1988 | [NTSB AAR-89/03](https://www.ntsb.gov/investigations/AccidentReports/Reports/AAR8903.pdf) |
| Air Transat 236 | 24 August 2001 | [GPIAA final report 22/ACCID/GPIAA/2001](https://www.faa.gov/sites/faa.gov/files/2022-11/AirTransat236_AccidentReport.pdf) |
| US Airways 1549 | 15 January 2009 | [NTSB AAR-10/03](https://www.ntsb.gov/investigations/AccidentReports/Reports/AAR1003.pdf) |
| Air France 447 | 1 June 2009 | [BEA final report](https://www.faa.gov/sites/faa.gov/files/f-cp090601.en_.pdf) |

How the paths are made:

- Every point on a path comes from a source: positions printed in the report (Air Transat 236 has a full position table from the flight data recorder, Air France 447 has its last reported position and wreckage site), airport and runway positions from FAA data (via AirNav) or Wikidata, and route waypoints from published navigation data.
- When a report gives a position only as a distance and direction (for example "about 4.5 miles north-northwest of the runway 22 end"), the point is placed from that and the timeline says so.
- Lines between points are straight. A part that is only a join between two places, not based on any position data, is drawn dashed. Each flight has a note saying what was simplified.
- Flights I could not find good path data for (for example Swissair 111 and the Gimli Glider, whose reports show the track only as a figure) were left out rather than guessed.

Other sources used: [Aviation Safety Network](https://aviation-safety.net/) and Wikipedia, linked on each flight. The documentaries are [Mentour Pilot](https://www.youtube.com/@MentourPilot) episodes, embedded from youtube-nocookie.com with a plain link underneath. Nothing is downloaded or re-hosted.

To add a flight, add an entry to `web/src/data/historyFlights.json`. The tests in `web/src/lib/history.test.ts` check every entry (coordinates in range, a departure first and a final position last, https sources, a valid video id, no em dashes).

## How it fits together

```mermaid
flowchart LR
    subgraph Pi["Raspberry Pi 5 (flightpi)"]
        Antenna["NooElec antenna"] --> Stick["RadarBox FlightStick"]
        Stick --> Readsb["readsb + tar1090<br/>aircraft.json"]

        subgraph Api["ASP.NET Core API (.NET 10)"]
            Poller["AircraftPoller<br/>every 10 s"] --> Saver["SightingSaver"]
            Lookup["AircraftDetailsLookup"]
            Cleanup["SightingCleanup<br/>daily, keeps 30 days"]
            Endpoints["REST endpoints<br/>/api/..."]
            Static["Static files<br/>(the React app)"]
        end

        Readsb --> Poller
        Saver --> Db[("PostgreSQL")]
        Lookup --> Db
        Cleanup --> Db
        Db --> Endpoints
    end

    OpenSky["OpenSky API<br/>(backup source)"] -.-> Poller
    Lookup <--> Adsbdb["adsbdb.com<br/>type, owner, route"]
    Endpoints --> Web["My Sky web app<br/>React, MapLibre, Motion"]
    Static --> Web
```

- The **poller** reads planes from the receiver (or from OpenSky, picked by one setting) and saves a sighting for each new position.
- **Plane details** (registration, type, owner) are looked up once per plane on adsbdb.com and kept in the database. Routes are only kept in memory, because adsbdb's route data may not be copied into other databases.
- The **web app** polls the API every few seconds and does the rest in the browser: smooth movement, where to look, the sky colors and the replay.

## Tech stack

| Part | What I used |
| --- | --- |
| API | C#, ASP.NET Core minimal APIs, .NET 10 |
| Database | PostgreSQL, Entity Framework Core with Npgsql |
| Receiver | RadarBox FlightStick, readsb, tar1090 on a Raspberry Pi 5 |
| Plane data | adsbdb.com (details and routes), OpenSky (backup source) |
| Web app | React, TypeScript, Vite, MapLibre GL with OpenFreeMap tiles, Motion |
| Tests | xUnit with an in-memory SQLite database, Vitest |
| CI | GitHub Actions |

## API

| Endpoint | What it returns |
| --- | --- |
| `GET /api/health` | Status and server time |
| `GET /api/planes/live` | Planes seen in the last 2 minutes with their latest position, details and route |
| `GET /api/planes/overhead?limit=5` | The closest planes to home |
| `GET /api/planes/trails?minutes=5` | Recent positions of live planes |
| `GET /api/planes/{icao24}/history?hours=24` | The path of one plane |
| `GET /api/stats` | Today's numbers for the story page |
| `GET /api/replay?from=...&to=...` | All sightings in a time range (at most 2 hours) |
| `GET /api/receiver` | Data source, online or not, message rate, plane count |

`FlightTracker.Api/FlightTracker.Api.http` has a request for each one.

## Running it on a PC

You need the .NET 10 SDK, Node.js and PostgreSQL.

1. Create the database and an app user:

   ```sql
   CREATE ROLE flighttracker_app WITH LOGIN PASSWORD 'pick-a-strong-password';
   CREATE DATABASE flighttracker OWNER flighttracker_app;
   ```

2. Save the connection string as a user secret (it never goes in the repo):

   ```powershell
   cd FlightTracker.Api
   dotnet user-secrets set "ConnectionStrings:FlightTracker" 'Host=localhost;Port=5432;Database=flighttracker;Username=flighttracker_app;Password=YOUR_PASSWORD'
   ```

3. Create the tables and start the API:

   ```powershell
   dotnet tool restore
   dotnet ef database update
   dotnet run --launch-profile http
   ```

4. In a second terminal, start the web app and open http://localhost:5173:

   ```powershell
   cd web
   npm install
   npm run dev
   ```

By default the API reads planes from the receiver at `http://flightpi.local/tar1090/data/aircraft.json`. To use OpenSky instead, set `"AircraftSource": "OpenSky"` in `appsettings.json` and add your OpenSky API client to user-secrets as `OpenSky:ClientId` and `OpenSky:ClientSecret`.

## Running it on the Pi

- [docs/pi-receiver.md](docs/pi-receiver.md): setting up the antenna, readsb and tar1090.
- [docs/pi-deploy.md](docs/pi-deploy.md): PostgreSQL on the Pi, publishing from the PC, the systemd service and logs.

## Tests

```powershell
dotnet test FlightTracker.slnx
cd web
npm test
```

The API tests cover the parsers, the unit and distance math, the receiver status and every endpoint (against an in-memory SQLite database, so PostgreSQL is not needed). The web tests cover the Look Up math, the airline lookup, the replay, the sun position and the Aviation history data. GitHub Actions runs both on every push and pull request.

## Project layout

```
FlightTracker.Api/          the API
  Sources/                  where planes come from (readsb and OpenSky)
  Services/                 polling, saving, queries, stats, plane details
  Endpoints/                the REST endpoints and their DTOs
FlightTracker.Api.Tests/    xUnit tests
web/                        the My Sky React app
deploy/                     publish script, systemd service, example settings for the Pi
docs/                       Pi guides and screenshots
```

## What I learned

This was my first time doing a lot of this, so I learned a mix of software and hardware.

- How to build and use a REST API, and how the frontend and the API talk to each other.
- How to set up a Raspberry Pi from scratch, connect to it over the network, and run my own code on it.
- How to use a real ADS-B antenna and receiver to pick up planes myself, instead of pulling data from someone else's service.
- How to build both the backend (C#, the database, and the background poller) and the frontend (the React map and the cards).
- How to add animations that feel smooth, like planes gliding between updates instead of jumping.

The part I am most proud of is that the data comes from my own antenna, not an API. Setting up the Pi and the receiver was the hardest part, and it taught me the most.
