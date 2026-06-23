# gnome-shutdown-timer

GNOME Shell 42 extension. Raw GJS (no build, no tests, no linter).

## Reload

`Alt+F2` → `r` → Enter (restarts Shell; all extensions reload).

## Architecture

- `Indicator` (`PanelMenu.Button`) holds a hidden `St.Button` (`_chip`)
  shown only during countdown. The quick-shutdown action lives in a
  `PopupImageMenuItem` inserted into the system menu (before the session
  submenu). Two states:
  - **Quick-shutdown state** — `_shutdownActive = false`. Chip hidden.
    Menu item visible, label `"Shutdown in 2:30"`, styled green via
    `.shutdownTimerMenuLabel`. Activating it calls
    `ScheduleShutdown("poweroff", now + 150min)` over DBus on
    `org.freedesktop.login1.Manager` and shows a `Main.notify`.
  - **Countdown state** — `_shutdownActive = true`. Chip visible, label
    `HH:MM:SS`, CSS class `.shutdownTimerPanel` (warm). Menu item hidden.
    Clicking the chip calls `CancelScheduledShutdown` over DBus.
- `Indicator.setTimerValue(time)` toggles between the two states: truthy
  value shows the chip + hides menu item; falsy hides chip + shows menu item.
- `ShutdownFileMonitor` watches `/run/systemd/shutdown/scheduled` for
  creates/deletes. It drives `Timer.setTimerValue()` →
  `Indicator.setTimerValue()` to toggle between states.
- Both states ensure `ellipsize` is cleared on the chip text.

## Key files

| File | Role |
|------|------|
| `extension.js` | Indicator + Extension lifecycle |
| `timer.js` | 1-second Mainloop countdown |
| `shutdown-file-monitor.js` | Gio.FileMonitor on systemd file |
| `shutdown-time-extractor.js` | Parses `USEC=` from shutdown file |
| `stylesheet.css` | `.shutdownTimerPanel` (countdown chip, warm) + `.shutdownTimerMenuLabel` (menu label, green) |
