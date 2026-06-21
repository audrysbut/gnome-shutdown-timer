# gnome-shutdown-timer

GNOME Shell 42 extension. Raw GJS (no build, no tests, no linter).

## Reload

`Alt+F2` → `r` → Enter (restarts Shell; all extensions reload).

## Architecture

- `Indicator` (PanelMenu.Button) holds a single `St.Button` (`_chip`) that
  swaps between two states:
  - **Quick-shutdown state** — `_shutdownActive = false`, label `"⏻ 2:30"`,
    CSS class `shutdownTimerQuickBtn` (green). Click calls
    `ScheduleShutdown("poweroff", now + 150min)` via DBus on
    `org.freedesktop.login1.Manager`.
  - **Countdown state** — `_shutdownActive = true`, label formatted as
    `HH:MM:SS`, CSS class `shutdownTimerPanel` (warm). Click calls
    `CancelScheduledShutdown` via DBus.
- `ShutdownFileMonitor` watches `/run/systemd/shutdown/scheduled` for
  creates/deletes. It drives `Timer.setTimerValue()` → `Indicator.setTimerValue()`
  to toggle between states.
- Both states always call `_syncTimerLabelLayout()` to clear ellipsize and
  center text vertically.

## Key files

| File | Role |
|------|------|
| `extension.js` | Indicator + Extension lifecycle |
| `timer.js` | 1-second Mainloop countdown |
| `shutdown-file-monitor.js` | Gio.FileMonitor on systemd file |
| `shutdown-time-extractor.js` | Parses `USEC=` from shutdown file |
| `stylesheet.css` | Two CSS classes: `.shutdownTimerPanel` (countdown, warm) + `.shutdownTimerQuickBtn` (quick, green) |
