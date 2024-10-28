const Gio = imports.gi.Gio;

var ShutdownTimeExtractor = class ShutdownTimeExtractor {
  getShutdownTime(filePath) {
    let file = Gio.File.new_for_path(filePath);

    try {
      let [success, contents] = file.load_contents(null);

      if (success) {
        let fileContent = contents.toString();
        let lines = fileContent.split("\n");
        const [, value] = lines[0].split("=");

        const actualValue = Math.floor(value / 1000);
        log(actualValue);
        return actualValue;
      } else {
        return undefined;
      }
    } catch (e) {
      logError(e);
    }
  }
}