const Gio = imports.gi.Gio;

const USEC_REGEX = /^USEC=(\d+)$/;

var ShutdownTimeExtractor = class ShutdownTimeExtractor {
  getShutdownTime(filePath) {
    const file = Gio.File.new_for_path(filePath);

    try {
      const [success, contents] = file.load_contents(null);

      if (!success) {
        return undefined;
      }

      const fileContent = contents.toString();
      for (const line of fileContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        const match = trimmed.match(USEC_REGEX);
        if (!match) {
          continue;
        }
        const usec = parseInt(match[1], 10);
        if (Number.isNaN(usec)) {
          return undefined;
        }
        return Math.floor(usec / 1000);
      }
      return undefined;
    } catch (e) {
      logError(e);
      return undefined;
    }
  }
};
