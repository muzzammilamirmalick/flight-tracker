# Setting up the ADS-B receiver on the Pi

This is how the receiver on `flightpi` was set up: a RadarBox FlightStick (an RTL-SDR stick tuned for 1090 MHz) with a NooElec antenna, on a Raspberry Pi 5.

The software is [readsb](https://github.com/wiedehopf/readsb), which decodes the plane signals, and [tar1090](https://github.com/wiedehopf/tar1090), which shows them on a web page and writes the `aircraft.json` file the flight tracker reads.

## 1. Check the stick is detected

Plug the stick into the Pi and run:

```bash
lsusb
```

Look for a Realtek line, something like:

```
Bus 001 Device 004: ID 0bda:2838 Realtek Semiconductor Corp. RTL2838 DVB-T
```

If it is not there, try another USB port or cable, and check `dmesg | tail` right after plugging it in.

## 2. Install readsb

wiedehopf's install script sets up readsb as a service, and the tar1090 web page with it:

```bash
sudo bash -c "$(wget -O - https://github.com/wiedehopf/adsb-scripts/raw/master/readsb-install.sh)"
sudo reboot
```

The reboot is only needed the first time rtl-sdr is used on the Pi. Running the same command again later updates readsb.

## 3. Set the location

readsb needs the receiver location (latitude, then longitude) to decode positions properly:

```bash
sudo readsb-set-location 43.25 -79.87
```

## 4. Set the gain

Let readsb tune the gain on its own:

```bash
sudo readsb-gain auto
```

Or set a fixed value, for example `sudo readsb-gain 43.9`. The [gain guide](https://github.com/wiedehopf/adsb-scripts/wiki/Optimizing-gain) explains how to pick one.

## 5. Check it works

Open `http://flightpi.local/tar1090` on any device at home. Planes should show up within a minute or two.

The file the flight tracker reads is:

```
http://flightpi.local/tar1090/data/aircraft.json
```

On the Pi itself that is `http://localhost/tar1090/data/aircraft.json`.

To update tar1090 on its own later:

```bash
sudo bash -c "$(wget -nv -O - https://github.com/wiedehopf/tar1090/raw/master/install.sh)"
```

## Antenna placement

Reception depends much more on the antenna than on anything else.

- Height matters most. Higher is better: a top floor window, the attic, or outside.
- Planes are line of sight. Walls, trees, metal siding and low-E window coatings all block signal.
- Keep the antenna upright (vertical). ADS-B signals are vertically polarized.
- Point it towards where most planes are. From Hamilton that is towards Toronto Pearson (north-east) and the lake.
- Keep the stick away from the Pi and its USB 3 ports, which give off noise right around 1090 MHz. A short USB extension cable helps.
- Use a short, good coax cable. Long thin cable loses signal.

A good setup near Pearson should decode dozens of messages a second. The status chip in the web app shows the current rate.

## Troubleshooting

See what readsb is doing:

```bash
sudo journalctl --no-pager -u readsb
```

If the logs say the kernel driver is active or the device is claimed, the TV tuner driver grabbed the stick. Block it and reboot:

```bash
echo -e 'blacklist rtl2832\nblacklist dvb_usb_rtl28xxu\nblacklist rtl8192cu\nblacklist rtl8xxxu\n' | sudo tee /etc/modprobe.d/blacklist-rtl-sdr.conf
sudo reboot
```

If `http://flightpi.local/tar1090` says "Connection refused", install the web server and run the readsb install again:

```bash
sudo apt install -y lighttpd
```

Settings live in `/etc/default/readsb`. After changing them run `sudo systemctl restart readsb`.
