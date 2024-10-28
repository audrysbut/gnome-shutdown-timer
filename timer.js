const Mainloop = imports.mainloop;

var Timer = class Timer {
  constructor(indicator) {
    this.timerHandler = undefined;
    this.timerValue = undefined;
    this.indicator = indicator;
  }

  setTimerValue(timerValue) {
    this.timerValue = timerValue;
    if (this.timerHandler) {
      this.#stopTimer();
    }

    this.timerValue = timerValue;
    if (this.timerValue) {
      const timeString = this.#getTimeString(this.timerValue);
      this.indicator.setTimerValue(timeString);

      this.indicator.show();

      this.timerHandler = Mainloop.timeout_add_seconds(1, () => {
        this.timerValue--;
        const timeString = this.#getTimeString(this.timerValue);
        this.indicator.setTimerValue(timeString);

        if (!this.timerValue) {
          this.#stopTimer();
        }
        return true;
      });
    } else {
      this.#stopTimer();
      this.indicator.hide();
    }
  }

  #stopTimer() {
    if (this.timerHandler) {
      Mainloop.source_remove(this.timerHandler);
      this.timerHandler = null;
    }
  }

  #getTimeString(diffSec) {
    if (!diffSec) {
      return;
    }

    const hours = Math.floor(diffSec / 3600);
    const minute = Math.floor((diffSec - hours * 3600) / 60);
    const seconds = diffSec - hours * 3600 - minute * 60;
    return `${this.#formatNumber(hours)}:${this.#formatNumber(
      minute
    )}:${this.#formatNumber(seconds)}`;
  }

  #formatNumber(number) {
    return number.toString().padStart(2, "0");
  }
};