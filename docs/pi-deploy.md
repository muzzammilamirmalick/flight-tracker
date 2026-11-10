# Running the flight tracker on the Pi

On the Pi the API, the database and the receiver all run on the same machine. The API also serves the web app, so the whole thing is one service at `http://flightpi.local:5000`.

Commands marked **PC** run in PowerShell on the PC, from the repo folder. Commands marked **Pi** run over SSH on the Pi (`ssh muzzammilmalick@flightpi.local`).

## 1. Install PostgreSQL (Pi)

```bash
sudo apt update
sudo apt install -y postgresql
```

It starts on its own and starts again after every reboot.

## 2. Create the database and the app user (Pi)

Pick a strong password with only letters and numbers, and keep it somewhere safe.

```bash
sudo -u postgres psql -c "CREATE ROLE flighttracker_app WITH LOGIN PASSWORD 'pick-a-strong-password';"
sudo -u postgres psql -c "CREATE DATABASE flighttracker OWNER flighttracker_app;"
```

## 3. Check .NET (Pi)

The app needs the ASP.NET Core 10 runtime, not only the .NET runtime:

```bash
dotnet --list-runtimes
which dotnet
```

The list should have a `Microsoft.AspNetCore.App 10.x` line. If `which dotnet` is not `/usr/bin/dotnet`, put the right path in `ExecStart` in `deploy/flighttracker.service` before copying it over.

## 4. Build everything (PC)

```powershell
.\deploy\publish.ps1
```

This makes a `publish` folder with:

- `api`: the API built for the Pi, with the web app inside `api/wwwroot`
- `schema.sql`: the database tables. It is safe to run again after an update, it only adds what is missing.

## 5. Copy it to the Pi (PC)

```powershell
ssh muzzammilmalick@flightpi.local "sudo mkdir -p /opt/flighttracker && sudo chown muzzammilmalick /opt/flighttracker"
scp -r publish/* muzzammilmalick@flightpi.local:/opt/flighttracker/
scp deploy/flighttracker.service deploy/flighttracker.env.example muzzammilmalick@flightpi.local:/opt/flighttracker/
```

## 6. Create the tables (Pi)

```bash
psql "host=localhost dbname=flighttracker user=flighttracker_app" -f /opt/flighttracker/schema.sql
```

It asks for the app user password from step 2.

## 7. Add the settings and secrets (Pi)

The secrets go in a file outside the app folder that only root and the app user can read:

```bash
sudo mkdir -p /etc/flighttracker
sudo cp /opt/flighttracker/flighttracker.env.example /etc/flighttracker/flighttracker.env
sudo nano /etc/flighttracker/flighttracker.env
```

Replace `CHANGE_ME` with the password from step 2. Then lock the file down:

```bash
sudo chown root:muzzammilmalick /etc/flighttracker/flighttracker.env
sudo chmod 640 /etc/flighttracker/flighttracker.env
```

Settings use a double underscore for nested keys, so `Readsb:Url` in `appsettings.json` is `Readsb__Url` here.

## 8. Start the service (Pi)

```bash
sudo cp /opt/flighttracker/flighttracker.service /etc/systemd/system/flighttracker.service
sudo systemctl daemon-reload
sudo systemctl enable --now flighttracker
sudo systemctl status flighttracker
```

`enable` makes it start on boot. The service restarts on its own 10 seconds after a crash.

Check it is working:

```bash
curl http://localhost:5000/api/health
```

Then open `http://flightpi.local:5000` on a phone or PC at home.

## Logs (Pi)

Follow the logs live:

```bash
sudo journalctl -fu flighttracker
```

Only today's logs:

```bash
sudo journalctl -u flighttracker --since today
```

## Updating to a new version

1. **PC:** `.\deploy\publish.ps1`
2. **PC:** `scp -r publish/* muzzammilmalick@flightpi.local:/opt/flighttracker/`
3. **Pi:** `psql "host=localhost dbname=flighttracker user=flighttracker_app" -f /opt/flighttracker/schema.sql`
4. **Pi:** `sudo systemctl restart flighttracker`

## If something goes wrong

- **`status` says failed:** run `sudo journalctl -u flighttracker -n 50`. A missing connection string or a wrong password shows up there.
- **The map loads but there are no planes:** check `curl http://localhost/tar1090/data/aircraft.json` works on the Pi, and see [pi-receiver.md](pi-receiver.md).
- **The page does not open from other devices:** make sure `ASPNETCORE_URLS=http://0.0.0.0:5000` is in the env file, so it listens on the network and not only on the Pi itself.
