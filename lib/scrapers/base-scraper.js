"use strict";

require("core-js/modules/es.promise");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BaseScraper = exports.ScaperProgressTypes = exports.ScraperErrorTypes = void 0;

var _events = require("events");

var _waiting = require("../helpers/waiting");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const SCRAPE_PROGRESS = 'SCRAPE_PROGRESS';
let ScraperErrorTypes;
exports.ScraperErrorTypes = ScraperErrorTypes;

(function (ScraperErrorTypes) {
  ScraperErrorTypes["InvalidPassword"] = "INVALID_PASSWORD";
  ScraperErrorTypes["ChangePassword"] = "CHANGE_PASSWORD";
  ScraperErrorTypes["Timeout"] = "TIMEOUT";
  ScraperErrorTypes["AccountBlocked"] = "ACCOUNT_BLOCKED";
  ScraperErrorTypes["Generic"] = "GENERIC";
  ScraperErrorTypes["General"] = "GENERAL_ERROR";
})(ScraperErrorTypes || (exports.ScraperErrorTypes = ScraperErrorTypes = {}));

let ScaperProgressTypes;
exports.ScaperProgressTypes = ScaperProgressTypes;

(function (ScaperProgressTypes) {
  ScaperProgressTypes["Initializing"] = "INITIALIZING";
  ScaperProgressTypes["StartScraping"] = "START_SCRAPING";
  ScaperProgressTypes["LoggingIn"] = "LOGGING_IN";
  ScaperProgressTypes["LoginSuccess"] = "LOGIN_SUCCESS";
  ScaperProgressTypes["LoginFailed"] = "LOGIN_FAILED";
  ScaperProgressTypes["ChangePassword"] = "CHANGE_PASSWORD";
  ScaperProgressTypes["EndScraping"] = "END_SCRAPING";
  ScaperProgressTypes["Terminating"] = "TERMINATING";
})(ScaperProgressTypes || (exports.ScaperProgressTypes = ScaperProgressTypes = {}));

function createErrorResult(errorType, errorMessage) {
  return {
    success: false,
    errorType,
    errorMessage
  };
}

function createTimeoutError(errorMessage) {
  return createErrorResult(ScraperErrorTypes.Timeout, errorMessage);
}

function createGenericError(errorMessage) {
  return createErrorResult(ScraperErrorTypes.Generic, errorMessage);
}

class BaseScraper {
  constructor(options) {
    this.options = options;

    _defineProperty(this, "eventEmitter", new _events.EventEmitter());
  } // eslint-disable-next-line  @typescript-eslint/require-await


  async initialize() {
    this.emitProgress(ScaperProgressTypes.Initializing);
  }

  async scrape(credentials) {
    this.emitProgress(ScaperProgressTypes.StartScraping);
    await this.initialize();
    let loginResult;

    try {
      loginResult = await this.login(credentials);
    } catch (e) {
      loginResult = e instanceof _waiting.TimeoutError ? createTimeoutError(e.message) : createGenericError(e.message);
    }

    let scrapeResult;

    if (loginResult.success) {
      try {
        scrapeResult = await this.fetchData();
      } catch (e) {
        scrapeResult = e instanceof _waiting.TimeoutError ? createTimeoutError(e.message) : createGenericError(e.message);
      }
    } else {
      scrapeResult = loginResult;
    }

    try {
      await this.terminate();
    } catch (e) {
      scrapeResult = createGenericError(e.message);
    }

    this.emitProgress(ScaperProgressTypes.EndScraping);
    return scrapeResult;
  } // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await


  async login(_credentials) {
    throw new Error(`login() is not created in ${this.options.companyId}`);
  } // eslint-disable-next-line  @typescript-eslint/require-await


  async fetchData() {
    throw new Error(`fetchData() is not created in ${this.options.companyId}`);
  } // eslint-disable-next-line  @typescript-eslint/require-await


  async terminate() {
    this.emitProgress(ScaperProgressTypes.Terminating);
  }

  emitProgress(type) {
    this.emit(SCRAPE_PROGRESS, {
      type
    });
  }

  emit(eventName, payload) {
    this.eventEmitter.emit(eventName, this.options.companyId, payload);
  }

  onProgress(func) {
    this.eventEmitter.on(SCRAPE_PROGRESS, func);
  }

}

exports.BaseScraper = BaseScraper;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zY3JhcGVycy9iYXNlLXNjcmFwZXIudHMiXSwibmFtZXMiOlsiU0NSQVBFX1BST0dSRVNTIiwiU2NyYXBlckVycm9yVHlwZXMiLCJTY2FwZXJQcm9ncmVzc1R5cGVzIiwiY3JlYXRlRXJyb3JSZXN1bHQiLCJlcnJvclR5cGUiLCJlcnJvck1lc3NhZ2UiLCJzdWNjZXNzIiwiY3JlYXRlVGltZW91dEVycm9yIiwiVGltZW91dCIsImNyZWF0ZUdlbmVyaWNFcnJvciIsIkdlbmVyaWMiLCJCYXNlU2NyYXBlciIsImNvbnN0cnVjdG9yIiwib3B0aW9ucyIsIkV2ZW50RW1pdHRlciIsImluaXRpYWxpemUiLCJlbWl0UHJvZ3Jlc3MiLCJJbml0aWFsaXppbmciLCJzY3JhcGUiLCJjcmVkZW50aWFscyIsIlN0YXJ0U2NyYXBpbmciLCJsb2dpblJlc3VsdCIsImxvZ2luIiwiZSIsIlRpbWVvdXRFcnJvciIsIm1lc3NhZ2UiLCJzY3JhcGVSZXN1bHQiLCJmZXRjaERhdGEiLCJ0ZXJtaW5hdGUiLCJFbmRTY3JhcGluZyIsIl9jcmVkZW50aWFscyIsIkVycm9yIiwiY29tcGFueUlkIiwiVGVybWluYXRpbmciLCJ0eXBlIiwiZW1pdCIsImV2ZW50TmFtZSIsInBheWxvYWQiLCJldmVudEVtaXR0ZXIiLCJvblByb2dyZXNzIiwiZnVuYyIsIm9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7QUFFQTs7OztBQUlBLE1BQU1BLGVBQWUsR0FBRyxpQkFBeEI7SUFFWUMsaUI7OztXQUFBQSxpQjtBQUFBQSxFQUFBQSxpQjtBQUFBQSxFQUFBQSxpQjtBQUFBQSxFQUFBQSxpQjtBQUFBQSxFQUFBQSxpQjtBQUFBQSxFQUFBQSxpQjtBQUFBQSxFQUFBQSxpQjtHQUFBQSxpQixpQ0FBQUEsaUI7O0lBMEZBQyxtQjs7O1dBQUFBLG1CO0FBQUFBLEVBQUFBLG1CO0FBQUFBLEVBQUFBLG1CO0FBQUFBLEVBQUFBLG1CO0FBQUFBLEVBQUFBLG1CO0FBQUFBLEVBQUFB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RDs7QUFFRGpCLEVBQUFBLFlBQVksQ0FBQ2tCLElBQUQsRUFBNEI7QUFDdEMsU0FBS0MsSUFBTCxDQUFVbkMsZUFBVixFQUEyQjtBQUFFa0MsTUFBQUE7QUFBRixLQUEzQjtBQUNEOztBQUVEQyxFQUFBQSxJQUFJLENBQUNDLFNBQUQsRUFBb0JDLE9BQXBCLEVBQWtEO0FBQ3BELFNBQUtDLFlBQUwsQ0FBa0JILElBQWxCLENBQXVCQyxTQUF2QixFQUFrQyxLQUFLdkIsT0FBTCxDQUFhbUIsU0FBL0MsRUFBMERLLE9BQTFEO0FBQ0Q7O0FBRURFLEVBQUFBLFVBQVUsQ0FBQ0MsSUFBRCxFQUFpQztBQUN6QyxTQUFLRixZQUFMLENBQWtCRyxFQUFsQixDQUFxQnpDLGVBQXJCLEVBQXNDd0MsSUFBdEM7QUFDRDs7QUF6RXNCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcbmltcG9ydCB7IEJyb3dzZXIsIFBhZ2UgfSBmcm9tICdwdXBwZXRlZXInO1xuaW1wb3J0IHsgVGltZW91dEVycm9yIH0gZnJvbSAnLi4vaGVscGVycy93YWl0aW5nJztcbmltcG9ydCB7IFRyYW5zYWN0aW9uc0FjY291bnQgfSBmcm9tICcuLi90cmFuc2FjdGlvbnMnO1xuaW1wb3J0IHsgQ29tcGFueVR5cGVzIH0gZnJvbSAnLi4vZGVmaW5pdGlvbnMnO1xuXG5jb25zdCBTQ1JBUEVfUFJPR1JFU1MgPSAnU0NSQVBFX1BST0dSRVNTJztcblxuZXhwb3J0IGVudW0gU2NyYXBlckVycm9yVHlwZXMge1xuICBJbnZhbGlkUGFzc3dvcmQgPSdJTlZBTElEX1BBU1NXT1JEJyxcbiAgQ2hhbmdlUGFzc3dvcmQgPSAnQ0hBTkdFX1BBU1NXT1JEJyxcbiAgVGltZW91dCA9ICdUSU1FT1VUJyxcbiAgQWNjb3VudEJsb2NrZWQgPSAnQUNDT1VOVF9CTE9DS0VEJyxcbiAgR2VuZXJpYyA9ICdHRU5FUklDJyxcbiAgR2VuZXJhbCA9ICdHRU5FUkFMX0VSUk9SJ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNjYXBlckxvZ2luUmVzdWx0IHtcbiAgc3VjY2VzczogYm9vbGVhbjtcbiAgZXJyb3JUeXBlPzogU2NyYXBlckVycm9yVHlwZXM7XG4gIGVycm9yTWVzc2FnZT86IHN0cmluZzsgLy8gb25seSBvbiBzdWNjZXNzPWZhbHNlXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NhcGVyU2NyYXBpbmdSZXN1bHQge1xuICBzdWNjZXNzOiBib29sZWFuO1xuICBhY2NvdW50cz86IFRyYW5zYWN0aW9uc0FjY291bnRbXTtcbiAgZXJyb3JUeXBlPzogU2NyYXBlckVycm9yVHlwZXM7XG4gIGVycm9yTWVzc2FnZT86IHN0cmluZzsgLy8gb25seSBvbiBzdWNjZXNzPWZhbHNlXG59XG5cbmV4cG9ydCB0eXBlIFNjcmFwZXJDcmVkZW50aWFscyA9IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NhcGVyT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBUaGUgY29tcGFueSB5b3Ugd2FudCB0byBzY3JhcGVcbiAgICovXG4gIGNvbXBhbnlJZDogQ29tcGFueVR5cGVzO1xuXG4gIC8qKlxuICAgKiBpbmNsdWRlIG1vcmUgZGVidWcgaW5mbyBhYm91dCBpbiB0aGUgb3V0cHV0XG4gICAqL1xuICB2ZXJib3NlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogdGhlIGRhdGUgdG8gZmV0Y2ggdHJhbnNhY3Rpb25zIGZyb20gKGNhbid0IGJlIGJlZm9yZSB0aGUgbWluaW11bSBhbGxvd2VkIHRpbWUgZGlmZmVyZW5jZSBmb3IgdGhlIHNjcmFwZXIpXG4gICAqL1xuICBzdGFydERhdGU6IERhdGU7XG5cbiAgLyoqXG4gICAqIHRoZSBkYXRlIHRvIGZldGNoIHRyYW5zYWN0aW9ucyB0b1xuICAgKi9cbiAgZW5kRGF0ZTogRGF0ZTtcblxuICAvKipcbiAgICogc2hvd3MgdGhlIGJyb3dzZXIgd2hpbGUgc2NyYXBpbmcsIGdvb2QgZm9yIGRlYnVnZ2luZyAoZGVmYXVsdCBmYWxzZSlcbiAgICovXG4gIHNob3dCcm93c2VyPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogb3B0aW9uIGZyb20gaW5pdCBwdXBwZXRlZXIgYnJvd3NlciBpbnN0YW5jZSBvdXRzaWRlIHRoZSBsaWJhcnkgc2NvcGUuIHlvdSBjYW4gZ2V0XG4gICAqIGJyb3dzZXIgZGlyZXRseSBmcm9tIHB1cHBldGVlciB2aWEgYHB1cHBldGVlci5sYXVuY2goKWBcbiAgICovXG4gIGJyb3dzZXI/OiBhbnk7XG5cbiAgLyoqXG4gICAqIHByb3ZpZGUgYSBwYXRjaCB0byBsb2NhbCBjaHJvbWl1bSB0byBiZSB1c2VkIGJ5IHB1cHBldGVlci4gUmVsZXZhbnQgd2hlbiB1c2luZ1xuICAgKiBgaXNyYWVsaS1iYW5rLXNjcmFwZXJzLWNvcmVgIGxpYnJhcnlcbiAgICovXG4gIGV4ZWN1dGFibGVQYXRoPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBpZiBzZXQgdG8gdHJ1ZSwgYWxsIGluc3RhbGxtZW50IHRyYW5zYWN0aW9ucyB3aWxsIGJlIGNvbWJpbmUgaW50byB0aGUgZmlyc3Qgb25lXG4gICAqL1xuICBjb21iaW5lSW5zdGFsbG1lbnRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogYWRkaXRpb25hbCBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgYnJvd3NlciBpbnN0YW5jZS4gVGhlIGxpc3Qgb2YgZmxhZ3MgY2FuIGJlIGZvdW5kIGluXG4gICAqXG4gICAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvTW96aWxsYS9Db21tYW5kX0xpbmVfT3B0aW9uc1xuICAgKiBodHRwczovL3BldGVyLnNoL2V4cGVyaW1lbnRzL2Nocm9taXVtLWNvbW1hbmQtbGluZS1zd2l0Y2hlcy9cbiAgICovXG4gIGFyZ3M/OiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogYWRqdXN0IHRoZSBicm93c2VyIGluc3RhbmNlIGJlZm9yZSBpdCBpcyBiZWluZyB1c2VkXG4gICAqXG4gICAqIEBwYXJhbSBicm93c2VyXG4gICAqL1xuICBwcmVwYXJlQnJvd3Nlcj86IChicm93c2VyOiBCcm93c2VyKSA9PiBQcm9taXNlPHZvaWQ+O1xuXG4gIC8qKlxuICAgKiBhZGp1c3QgdGhlIHBhZ2UgaW5zdGFuY2UgYmVmb3JlIGl0IGlzIGJlaW5nIHVzZWQuXG4gICAqXG4gICAqIEBwYXJhbSBwYWdlXG4gICAqL1xuICBwcmVwYXJlUGFnZT86IChwYWdlOiBQYWdlKSA9PiBQcm9taXNlPHZvaWQ+O1xufVxuXG5leHBvcnQgZW51bSBTY2FwZXJQcm9ncmVzc1R5cGVzIHtcbiAgSW5pdGlhbGl6aW5nID0gJ0lOSVRJQUxJWklORycsXG4gIFN0YXJ0U2NyYXBpbmcgPSAnU1RBUlRfU0NSQVBJTkcnLFxuICBMb2dnaW5nSW4gPSAnTE9HR0lOR19JTicsXG4gIExvZ2luU3VjY2VzcyA9ICdMT0dJTl9TVUNDRVNTJyxcbiAgTG9naW5GYWlsZWQgPSAnTE9HSU5fRkFJTEVEJyxcbiAgQ2hhbmdlUGFzc3dvcmQgPSAnQ0hBTkdFX1BBU1NXT1JEJyxcbiAgRW5kU2NyYXBpbmcgPSAnRU5EX1NDUkFQSU5HJyxcbiAgVGVybWluYXRpbmcgPSAnVEVSTUlOQVRJTkcnLFxufVxuXG5mdW5jdGlvbiBjcmVhdGVFcnJvclJlc3VsdChlcnJvclR5cGU6IFNjcmFwZXJFcnJvclR5cGVzLCBlcnJvck1lc3NhZ2U6IHN0cmluZykge1xuICByZXR1cm4ge1xuICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgIGVycm9yVHlwZSxcbiAgICBlcnJvck1lc3NhZ2UsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRpbWVvdXRFcnJvcihlcnJvck1lc3NhZ2U6IHN0cmluZykge1xuICByZXR1cm4gY3JlYXRlRXJyb3JSZXN1bHQoU2NyYXBlckVycm9yVHlwZXMuVGltZW91dCwgZXJyb3JNZXNzYWdlKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlR2VuZXJpY0Vycm9yKGVycm9yTWVzc2FnZTogc3RyaW5nKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvclJlc3VsdChTY3JhcGVyRXJyb3JUeXBlcy5HZW5lcmljLCBlcnJvck1lc3NhZ2UpO1xufVxuXG5leHBvcnQgY2xhc3MgQmFzZVNjcmFwZXIge1xuICBwcml2YXRlIGV2ZW50RW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgb3B0aW9uczogU2NhcGVyT3B0aW9ucykge1xuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVxdWlyZS1hd2FpdFxuICBhc3luYyBpbml0aWFsaXplKCkge1xuICAgIHRoaXMuZW1pdFByb2dyZXNzKFNjYXBlclByb2dyZXNzVHlwZXMuSW5pdGlhbGl6aW5nKTtcbiAgfVxuXG4gIGFzeW5jIHNjcmFwZShjcmVkZW50aWFsczogU2NyYXBlckNyZWRlbnRpYWxzKTogUHJvbWlzZTxTY2FwZXJTY3JhcGluZ1Jlc3VsdD4ge1xuICAgIHRoaXMuZW1pdFByb2dyZXNzKFNjYXBlclByb2dyZXNzVHlwZXMuU3RhcnRTY3JhcGluZyk7XG4gICAgYXdhaXQgdGhpcy5pbml0aWFsaXplKCk7XG5cbiAgICBsZXQgbG9naW5SZXN1bHQ7XG4gICAgdHJ5IHtcbiAgICAgIGxvZ2luUmVzdWx0ID0gYXdhaXQgdGhpcy5sb2dpbihjcmVkZW50aWFscyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9naW5SZXN1bHQgPSBlIGluc3RhbmNlb2YgVGltZW91dEVycm9yID9cbiAgICAgICAgY3JlYXRlVGltZW91dEVycm9yKGUubWVzc2FnZSkgOlxuICAgICAgICBjcmVhdGVHZW5lcmljRXJyb3IoZS5tZXNzYWdlKTtcbiAgICB9XG5cbiAgICBsZXQgc2NyYXBlUmVzdWx0O1xuICAgIGlmIChsb2dpblJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBzY3JhcGVSZXN1bHQgPSBhd2FpdCB0aGlzLmZldGNoRGF0YSgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBzY3JhcGVSZXN1bHQgPVxuICAgICAgICAgIGUgaW5zdGFuY2VvZiBUaW1lb3V0RXJyb3IgP1xuICAgICAgICAgICAgY3JlYXRlVGltZW91dEVycm9yKGUubWVzc2FnZSkgOlxuICAgICAgICAgICAgY3JlYXRlR2VuZXJpY0Vycm9yKGUubWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjcmFwZVJlc3VsdCA9IGxvZ2luUmVzdWx0O1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnRlcm1pbmF0ZSgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHNjcmFwZVJlc3VsdCA9IGNyZWF0ZUdlbmVyaWNFcnJvcihlLm1lc3NhZ2UpO1xuICAgIH1cbiAgICB0aGlzLmVtaXRQcm9ncmVzcyhTY2FwZXJQcm9ncmVzc1R5cGVzLkVuZFNjcmFwaW5nKTtcblxuICAgIHJldHVybiBzY3JhcGVSZXN1bHQ7XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLCBAdHlwZXNjcmlwdC1lc2xpbnQvcmVxdWlyZS1hd2FpdFxuICBhc3luYyBsb2dpbihfY3JlZGVudGlhbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiBQcm9taXNlPFNjYXBlckxvZ2luUmVzdWx0PiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBsb2dpbigpIGlzIG5vdCBjcmVhdGVkIGluICR7dGhpcy5vcHRpb25zLmNvbXBhbnlJZH1gKTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgQHR5cGVzY3JpcHQtZXNsaW50L3JlcXVpcmUtYXdhaXRcbiAgYXN5bmMgZmV0Y2hEYXRhKCk6IFByb21pc2U8U2NhcGVyU2NyYXBpbmdSZXN1bHQ+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGZldGNoRGF0YSgpIGlzIG5vdCBjcmVhdGVkIGluICR7dGhpcy5vcHRpb25zLmNvbXBhbnlJZH1gKTtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSAgQHR5cGVzY3JpcHQtZXNsaW50L3JlcXVpcmUtYXdhaXRcbiAgYXN5bmMgdGVybWluYXRlKCkge1xuICAgIHRoaXMuZW1pdFByb2dyZXNzKFNjYXBlclByb2dyZXNzVHlwZXMuVGVybWluYXRpbmcpO1xuICB9XG5cbiAgZW1pdFByb2dyZXNzKHR5cGU6IFNjYXBlclByb2dyZXNzVHlwZXMpIHtcbiAgICB0aGlzLmVtaXQoU0NSQVBFX1BST0dSRVNTLCB7IHR5cGUgfSk7XG4gIH1cblxuICBlbWl0KGV2ZW50TmFtZTogc3RyaW5nLCBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KSB7XG4gICAgdGhpcy5ldmVudEVtaXR0ZXIuZW1pdChldmVudE5hbWUsIHRoaXMub3B0aW9ucy5jb21wYW55SWQsIHBheWxvYWQpO1xuICB9XG5cbiAgb25Qcm9ncmVzcyhmdW5jOiAoLi4uYXJnczogYW55W10pID0+IHZvaWQpIHtcbiAgICB0aGlzLmV2ZW50RW1pdHRlci5vbihTQ1JBUEVfUFJPR1JFU1MsIGZ1bmMpO1xuICB9XG59XG4iXX0=