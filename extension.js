const { extensionUtils } = imports.misc;
const Me = extensionUtils.getCurrentExtension();

const Timer = Me.imports.timer.Timer;  
const ShutdownFileMonitor = Me.imports['shutdown-file-monitor'].ShutdownFileMonitor
const ShutdownTimeExtractor = Me.imports['shutdown-time-extractor'].ShutdownTimeExtractor
const GETTEXT_DOMAIN = "my-indicator-extension";
const { GObject, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("ShutdownTimer"));

      this.button = new St.Button({
        style_class: "shutdownTimerPanel",
        label: "",
      });
      this.add_child(this.button);
    }

    setTimerValue(time) {
      if (time) {
        this.button.set_label(time);
        return;
      }
    }
  }
);

class Extension {
  constructor(uuid) {
    this._uuid = uuid;
    ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
  }

  enable() {
    this._indicator = new Indicator();
    this._indicator.hide();

    const extractor = new ShutdownTimeExtractor();
    const timer = new Timer(this._indicator);
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
