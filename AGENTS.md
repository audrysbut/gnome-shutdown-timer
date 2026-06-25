# gnome-shutdown-timer

GNOME Shell 42 extension. Raw GJS (no build, no tests, no linter).

## Reload

`Alt+F2` → `r` → Enter (restarts Shell; all extensions reload).

## Architecture

- `Indicator` (`PanelMenu.Button`) holds a single `St.Button` (`_chip`)
  wrapped in `St.Bin`. The chip swaps between two states:
  - **Quick-shutdown state** — `_shutdownActive = false`, label `"⏻ 2:30"`,
    CSS classes `shutdownTimerPanel shutdownTimerQuickBtn` (green accent).
    Click calls `ScheduleShutdown("poweroff", now + 150min)` on
    `org.freedesktop.login1.Manager` via DBus.
  - **Countdown state** — `_shutdownActive = true`, label `HH:MM:SS`,
    CSS class `shutdownTimerPanel` only (warm). Click calls
    `CancelScheduledShutdown` via DBus.
- `Timer.setTimerValue(time)` → `Indicator.setTimerValue(time)` toggles
  between states: swaps label, removes/adds `shutdownTimerQuickBtn` class,
  sets `_shutdownActive`.
- Both states call `_syncTimerLabelLayout()` to clear ellipsize and center
  text vertically.
- `ShutdownFileMonitor` watches `/run/systemd/shutdown/scheduled` for
  creates/deletes. It drives `Timer.setTimerValue()` to toggle between states.

## Key files

| File | Role |
|------|------|
| `extension.js` | Indicator + Extension lifecycle |
| `timer.js` | 1-second Mainloop countdown |
| `shutdown-file-monitor.js` | Gio.FileMonitor on systemd file |
| `shutdown-time-extractor.js` | Parses `USEC=` from shutdown file |
| `stylesheet.css` | `.shutdownTimerPanel` (countdown chip, warm) + `.shutdownTimerQuickBtn` (quick, green) |
