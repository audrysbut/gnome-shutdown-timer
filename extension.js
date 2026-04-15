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

const { Clutter, GObject, Gio, Pango, St } = imports.gi;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("ShutdownTimer"), true);

      this._timer = null;

      this.button = new St.Button({
        style_class: "shutdownTimerPanel",
        label: "",
        // Natural width/height so the full "HH:MM:SS" is allocated; expand +
        // default ellipsize clips the label in the panel.
        x_expand: false,
        y_expand: false,
      });
      // Clicks hit this child St.Button; the parent PanelMenu.Button's
      // vfunc_event is not invoked for events delivered to the child.
      this.button.connect("clicked", () => {
        if (!this._timer || this._timer.timerValue == null) return;
        this._onTimerClicked();
      });
      this.add_child(this.button);
    }

    setShutdownTimer(timer) {
      this._timer = timer;
    }

    _cancelSystemShutdown() {
      try {
        // Shell 42 / older GJS: makeForBusSync is unavailable; use new_for_bus_sync.
        const proxy = Gio.DBusProxy.new_for_bus_sync(
          Gio.BusType.SYSTEM,
          Gio.DBusProxyFlags.NONE,
          null,
          "org.freedesktop.login1",
          "/org/freedesktop/login1",
          "org.freedesktop.login1.Manager",
          null
        );
        proxy.call_sync(
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

    /**
     * St.Button's label is a Clutter.Text on this Shell, not St.Label (see debug
     * logs: childName Clutter_Text). Ellipsize must be cleared on that actor.
     */
    _syncTimerLabelLayout() {
      const applyToText = (ct) => {
        if (!ct) return;
        ct.line_wrap = false;
        ct.ellipsize = Pango.EllipsizeMode.NONE;
      };

      const child = this.button.get_child();
      if (child instanceof Clutter.Text) {
        applyToText(child);
        return;
      }
      if (child instanceof St.Label) {
        applyToText(child.clutter_text);
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
      walk(this.button);
    }

    setTimerValue(time) {
      if (time) {
        this.button.set_label(time);
        this._syncTimerLabelLayout();
        return;
      }
      this.button.set_label("");
      this._syncTimerLabelLayout();
    }
  }
);

class Extension {
  constructor(uuid) {
    this._uuid = uuid;
  }

  enable() {
    this._indicator = new Indicator();
    this._indicator.hide();

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
