const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Timer = Me.imports.timer.Timer;
const ShutdownFileMonitor =
  Me.imports["shutdown-file-monitor"].ShutdownFileMonitor;
const ShutdownTimeExtractor =
  Me.imports["shutdown-time-extractor"].ShutdownTimeExtractor;

const GETTEXT_DOMAIN = "my-indicator-extension";
ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
const Gettext = imports.gettext;
const _ = Gettext.domain(GETTEXT_DOMAIN).gettext;

const { Clutter, GLib, GObject, Gio, Pango, St } = imports.gi;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("ShutdownTimer"), true);

      this._timer = null;
      this._dbusProxy = null;
      this._shutdownActive = false;

      this._chip = new St.Button({
        style_class: "shutdownTimerPanel",
        label: "",
        x_expand: false,
        y_expand: false,
      });
      this._chip.add_style_class_name("shutdownTimerQuickBtn");
      this._chip.set_label("⏻ 2:30");
      this._syncTimerLabelLayout();
      this._chip.connect("clicked", () => {
        if (this._shutdownActive) {
          this._onTimerClicked();
        } else {
          this._onQuickShutdownClicked();
        }
      });
      this._chipWrap = new St.Bin({ child: this._chip });
      this.add_child(this._chipWrap);
    }

    setShutdownTimer(timer) {
      this._timer = timer;
    }

    _cancelSystemShutdown() {
      try {
        if (!this._dbusProxy) {
          this._dbusProxy = Gio.DBusProxy.new_for_bus_sync(
            Gio.BusType.SYSTEM,
            Gio.DBusProxyFlags.NONE,
            null,
            "org.freedesktop.login1",
            "/org/freedesktop/login1",
            "org.freedesktop.login1.Manager",
            null
          );
        }
        this._dbusProxy.call_sync(
          "CancelScheduledShutdown",
          null,
          Gio.DBusCallFlags.NONE,
          -1,
          null
        );
        return true;
      } catch (e) {
        logError(e, "shutdown-timer: CancelScheduledShutdown failed");
        return false;
      }
    }

    _onTimerClicked() {
      if (this._cancelSystemShutdown()) this._timer.setTimerValue(undefined);
    }

    _onQuickShutdownClicked() {
      try {
        if (!this._dbusProxy) {
          this._dbusProxy = Gio.DBusProxy.new_for_bus_sync(
            Gio.BusType.SYSTEM,
            Gio.DBusProxyFlags.NONE,
            null,
            "org.freedesktop.login1",
            "/org/freedesktop/login1",
            "org.freedesktop.login1.Manager",
            null
          );
        }
        const usec = GLib.get_real_time() + 150 * 60 * 1000000;
        this._dbusProxy.call_sync(
          "ScheduleShutdown",
          new GLib.Variant("(st)", ["poweroff", usec]),
          Gio.DBusCallFlags.NONE,
          -1,
          null
        );
      } catch (e) {
        logError(e, "shutdown-timer: ScheduleShutdown failed");
      }
    }

    _syncTimerLabelLayout() {
      const applyToText = (ct) => {
        if (!ct) return;
        ct.line_wrap = false;
        ct.ellipsize = Pango.EllipsizeMode.NONE;
        if (ct instanceof Clutter.Actor) {
          ct.x_align = Clutter.ActorAlign.CENTER;
          ct.y_align = Clutter.ActorAlign.CENTER;
        }
      };

      const child = this._chip.get_child();
      if (child instanceof Clutter.Text) {
        applyToText(child);
        this._chip.x_align = Clutter.ActorAlign.CENTER;
        this._chip.y_align = Clutter.ActorAlign.CENTER;
        return;
      }
      if (child instanceof St.Label) {
        applyToText(child.clutter_text);
        this._chip.x_align = Clutter.ActorAlign.CENTER;
        this._chip.y_align = Clutter.ActorAlign.CENTER;
        return;
      }
      const walk = (a) => {
        if (!a) return;
        if (a instanceof Clutter.Text) {
          applyToText(a);
          return;
        }
        if (a instanceof St.Label) {
          applyToText(a.clutter_text);
          return;
        }
        for (const c of a.get_children?.() ?? []) walk(c);
      };
      walk(this._chip);
      this._chip.x_align = Clutter.ActorAlign.CENTER;
      this._chip.y_align = Clutter.ActorAlign.CENTER;
    }

    setTimerValue(time) {
      if (time) {
        this._chip.remove_style_class_name("shutdownTimerQuickBtn");
        this._chip.set_label(time);
        this._syncTimerLabelLayout();
        this._shutdownActive = true;
        return;
      }
      this._chip.add_style_class_name("shutdownTimerQuickBtn");
      this._chip.set_label("⏻ 2:30");
      this._syncTimerLabelLayout();
      this._shutdownActive = false;
    }
  }
);

class Extension {
  constructor(uuid) {
    this._uuid = uuid;
  }

  enable() {
    this._indicator = new Indicator();

    const extractor = new ShutdownTimeExtractor();
    const timer = new Timer(this._indicator);
    this._indicator.setShutdownTimer(timer);
    this.monitor = new ShutdownFileMonitor(extractor, timer);
    Main.panel.addToStatusArea(this._uuid, this._indicator);
    // Main.panel.addToStatusArea(this._uuid, this._indicator, 0, 'left');

    this.monitor.watchFile();
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
    this.monitor.stopWatchingFile();
  }
}

function init(meta) {
  return new Extension(meta.uuid);
}
