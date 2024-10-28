const Gio = imports.gi.Gio;

var ShutdownFileMonitor = class ShutdownFileMonitor {
  constructor(extractor, timer) {
    this.filePath = "/run/systemd/shutdown/scheduled";
    this.monitor = undefined;
    this.extractor = extractor;
    this.timer = timer;

    this.#init();
  }

  #init() {
    let file = Gio.File.new_for_path(this.filePath);
    if (file.query_exists(null)) {
      this.#onFileCreated(file);
    } else {
      this.#onFileDeleted(file);
    }
  }

  watchFile() {
    let file = Gio.File.new_for_path(this.filePath);

    this.monitor = file.monitor(Gio.FileMonitorFlags.NONE, null);
    this.monitor.connect("changed", (_1, file, _2, eventType) => {
      switch (eventType) {
        case Gio.FileMonitorEvent.CREATED:
          this.#onFileCreated(file);
          break;
        case Gio.FileMonitorEvent.DELETED:
          this.#onFileDeleted(file);
          break;
      }
    });
  }

  #onFileDeleted(file) {
    log(`File deleted: ${file.get_path()}`);
    this.timer.setTimerValue(undefined);
  }

  #onFileCreated(file) {
    log(`File created: ${file.get_path()}`);
    const shutdownTime = this.extractor.getShutdownTime(this.filePath);
    const diffSec = this.#getDiffInSeconds(shutdownTime);
    log(`diffSecs: ${diffSec}`);
    this.timer.setTimerValue(diffSec);
  }

  #getDiffInSeconds(shutDownTime) {
    if (!shutDownTime) {
      return;
    }

    return Math.floor((shutDownTime - new Date().getTime()) / 1000) + 1;
  }

  stopWatchingFile() {
    if (this.monitor !== null) {
      this.monitor.cancel(); // Cancel the monitor and stop watching
      this.monitor = null; // Clear the monitor reference
      log("File monitoring stopped");
    } else {
      log("No file monitor to stop");
    }
  }
};
