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
const PopupMenu = imports.ui.popupMenu;

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("ShutdownTimer"));

      this._timer = null;
      this._dbusProxy = null;
      this._shutdownActive = false;

      this._chip = new St.Button({
        style_class: "shutdownTimerPanel",
        label: "",
        x_expand: false,
        y_expand: false,
      });
      this.add_child(this._chip);
      this.visible = false;

      const chipText = this._chip.get_child();
      if (chipText instanceof Clutter.Text) {
        chipText.line_wrap = false;
        chipText.ellipsize = Pango.EllipsizeMode.NONE;
      }

      this._chip.connect("clicked", () => {
        if (this._shutdownActive) this._onTimerClicked();
      });

      this._menuItem = new PopupMenu.PopupImageMenuItem(
        _("Shutdown in 2:30"),
        "system-shutdown-symbolic"
      );
      this._menuItem.label.add_style_class_name("shutdownTimerMenuLabel");
      this._menuItem.connect("activate", () => {
        this._onQuickShutdownClicked();
      });

      this.connect("destroy", () => {
        if (this._menuItem) {
          if (this._menuItem.get_parent())
            this._menuItem.get_parent().remove_child(this._menuItem);
          this._menuItem.destroy();
          this._menuItem = null;
        }
      });

      this._insertIntoSystemMenu();
    }

    _insertIntoSystemMenu() {
      try {
        const aggregateMenu = Main.panel.statusArea.aggregateMenu;
        if (!aggregateMenu || !aggregateMenu._system) {
          this.menu.addMenuItem(this._menuItem);
          return;
        }

        const systemMenu = aggregateMenu._system.menu;
        const sessionSubMenu = aggregateMenu._system._sessionSubMenu;

        if (!sessionSubMenu) {
          systemMenu.addMenuItem(this._menuItem);
          return;
        }

        const menuItems = systemMenu._getMenuItems();
        const idx = menuItems.indexOf(sessionSubMenu);
        systemMenu.addMenuItem(this._menuItem, idx !== -1 ? idx : -1);
      } catch (e) {
        logError(e, "shutdown-timer: failed to insert into system menu");
        this.menu.addMenuItem(this._menuItem);
      }
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
        Main.notify(_("Shutdown scheduled for 2 hours 30 minutes"));
      } catch (e) {
        logError(e, "shutdown-timer: ScheduleShutdown failed");
      }
    }

    setTimerValue(time) {
      if (time) {
        this._chip.set_label(time);
        const chipText = this._chip.get_child();
        if (chipText instanceof Clutter.Text) {
          chipText.line_wrap = false;
          chipText.ellipsize = Pango.EllipsizeMode.NONE;
        }
        this.visible = true;
        this._menuItem.visible = false;
        this._shutdownActive = true;
        return;
      }
      this._chip.set_label("");
      this.visible = false;
      this._menuItem.visible = true;
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
