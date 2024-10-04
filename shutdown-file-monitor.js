const Gio = imports.gi.Gio;

var ShutdownFileMonitor = class ShutdownFileMonitor {
  constructor(extractor, timer) {
    this.filePath = "/run/systemd/shutdown/scheduled";
    this.monitor = undefined;
    this.extractor = extractor;
    this.timer = timer;
  }

  watchFile() {
    let file = Gio.File.new_for_path(this.filePath);

    this.monitor = file.monitor(Gio.FileMonitorFlags.NONE, null);
    this.monitor.connect("changed", (monitor, file, otherFile, eventType) => {
      switch (eventType) {
        case Gio.FileMonitorEvent.CREATED:
          log(`File created: ${file.get_path()}`);
          const shutdownTime = this.extractor.getShutdownTime(this.filePath);
          const diffSec = this.#getDiffInSeconds(shutdownTime);
          log(`diffSecs: ${diffSec}`);
          this.timer.setTimerValue(diffSec);
          break;
        case Gio.FileMonitorEvent.DELETED:
          log(`File deleted: ${file.get_path()}`);
          this.timer.setTimerValue(undefined);
          break;
      }
    });
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
