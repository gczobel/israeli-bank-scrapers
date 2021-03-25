"use strict";

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.promise");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BaseScraperWithBrowser = exports.LoginResults = void 0;

var _puppeteer = _interopRequireDefault(require("puppeteer"));

var _baseScraper = require("./base-scraper");

var _navigation = require("../helpers/navigation");

var _elementsInteractions = require("../helpers/elements-interactions");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

const VIEWPORT_WIDTH = 1024;
const VIEWPORT_HEIGHT = 768;
const OK_STATUS = 200;
var LoginBaseResults;

(function (LoginBaseResults) {
  LoginBaseResults["Success"] = "SUCCESS";
  LoginBaseResults["UnknownError"] = "UNKNOWN_ERROR";
})(LoginBaseResults || (LoginBaseResults = {}));

const {
  Timeout,
  Generic,
  General
} = _baseScraper.ScraperErrorTypes,
      rest = _objectWithoutProperties(_baseScraper.ScraperErrorTypes, ["Timeout", "Generic", "General"]);

const LoginResults = _objectSpread({}, rest, {}, LoginBaseResults);

exports.LoginResults = LoginResults;

async function getKeyByValue(object, value, page) {
  const keys = Object.keys(object);

  for (const key of keys) {
    // @ts-ignore
    const conditions = object[key];

    for (const condition of conditions) {
      let result = false;

      if (condition instanceof RegExp) {
        result = condition.test(value);
      } else if (typeof condition === 'function') {
        result = await condition({
          page,
          value
        });
      } else {
        result = value.toLowerCase() === condition.toLowerCase();
      }

      if (result) {
        // @ts-ignore
        return Promise.resolve(key);
      }
    }
  }

  return Promise.resolve(LoginResults.UnknownError);
}

function handleLoginResult(scraper, loginResult) {
  switch (loginResult) {
    case LoginResults.Success:
      scraper.emitProgress(_baseScraper.ScaperProgressTypes.LoginSuccess);
      return {
        success: true
      };

    case LoginResults.InvalidPassword:
    case LoginResults.UnknownError:
      scraper.emitProgress(_baseScraper.ScaperProgressTypes.LoginFailed);
      return {
        success: false,
        errorType: loginResult === LoginResults.InvalidPassword ? _baseScraper.ScraperErrorTypes.InvalidPassword : _baseScraper.ScraperErrorTypes.General,
        errorMessage: `Login failed with ${loginResult} error`
      };

    case LoginResults.ChangePassword:
      scraper.emitProgress(_baseScraper.ScaperProgressTypes.ChangePassword);
      return {
        success: false,
        errorType: _baseScraper.ScraperErrorTypes.ChangePassword
      };

    default:
      throw new Error(`unexpected login result "${loginResult}"`);
  }
}

function createGeneralError() {
  return {
    success: false,
    errorType: _baseScraper.ScraperErrorTypes.General
  };
}

class BaseScraperWithBrowser extends _baseScraper.BaseScraper {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "browser", void 0);

    _defineProperty(this, "page", void 0);
  }

  async initialize() {
    this.emitProgress(_baseScraper.ScaperProgressTypes.Initializing);
    let env;

    if (this.options.verbose) {
      env = _objectSpread({
        DEBUG: '*'
      }, process.env);
    }

    if (typeof this.options.browser !== 'undefined' && this.options.browser !== null) {
      this.browser = this.options.browser;
    } else {
      const executablePath = this.options.executablePath || undefined;
      const args = this.options.args || [];
      this.browser = await _puppeteer.default.launch({
        env,
        headless: !this.options.showBrowser,
        executablePath,
        args
      });
    }

    if (this.options.prepareBrowser) {
      await this.options.prepareBrowser(this.browser);
    }

    if (!this.browser) {
      return;
    }

    const pages = await this.browser.pages();

    if (pages.length) {
      [this.page] = pages;
    } else {
      this.page = await this.browser.newPage();
    }

    if (this.options.preparePage) {
      await this.options.preparePage(this.page);
    }

    await this.page.setViewport({
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT
    });
  }

  async navigateTo(url, page) {
    const pageToUse = page || this.page;

    if (!pageToUse) {
      return;
    }

    const response = await pageToUse.goto(url); // note: response will be null when navigating to same url while changing the hash part. the condition below will always accept null as valid result.

    if (response !== null && (response === undefined || response.status() !== OK_STATUS)) {
      throw new Error(`Error while trying to navigate to url ${url}`);
    }
  } // eslint-disable-next-line @typescript-eslint/no-unused-vars


  getLoginOptions(_credentials) {
    throw new Error(`getLoginOptions() is not created in ${this.options.companyId}`);
  }

  async fillInputs(fields) {
    const modified = [...fields];
    const input = modified.shift();

    if (!input) {
      return;
    }

    await (0, _elementsInteractions.fillInput)(this.page, input.selector, input.value);

    if (modified.length) {
      await this.fillInputs(modified);
    }
  }

  async login(credentials) {
    if (!credentials || !this.page) {
      return createGeneralError();
    }

    const loginOptions = this.getLoginOptions(credentials);
    await this.navigateTo(loginOptions.loginUrl);

    if (loginOptions.checkReadiness) {
      await loginOptions.checkReadiness();
    } else {
      await (0, _elementsInteractions.waitUntilElementFound)(this.page, loginOptions.submitButtonSelector);
    }

    if (loginOptions.preAction) {
      await loginOptions.preAction();
    }

    await this.fillInputs(loginOptions.fields);
    await (0, _elementsInteractions.clickButton)(this.page, loginOptions.submitButtonSelector);
    this.emitProgress(_baseScraper.ScaperProgressTypes.LoggingIn);

    if (loginOptions.postAction) {
      await loginOptions.postAction();
    } else {
      await (0, _navigation.waitForNavigation)(this.page);
    }

    const current = await (0, _navigation.getCurrentUrl)(this.page, true);
    const loginResult = await getKeyByValue(loginOptions.possibleResults, current, this.page);
    return handleLoginResult(this, loginResult);
  }

  async terminate() {
    this.emitProgress(_baseScraper.ScaperProgressTypes.Terminating);

    if (!this.browser) {
      return;
    }

    await this.browser.close();
  }

}

exports.BaseScraperWithBrowser = BaseScraperWithBrowser;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zY3JhcGVycy9iYXNlLXNjcmFwZXItd2l0aC1icm93c2VyLnRzIl0sIm5hbWVzIjpbIlZJRVdQT1JUX1dJRFRIIiwiVklFV1BPUlRfSEVJR0hUIiwiT0tfU1RBVFVTIiwiTG9naW5CYXNlUmVzdWx0cyIsIlRpbWVvdXQiLCJHZW5lcmljIiwiR2VuZXJhbCIsIlNjcmFwZXJFcnJvclR5cGVzIiwicmVzdCIsIkxvZ2luUmVzdWx0cyIsImdldEtleUJ5VmFsdWUiLCJvYmplY3QiLCJ2YWx1ZSIsInBhZ2UiLCJrZXlzIiwiT2JqZWN0Iiwia2V5IiwiY29uZGl0aW9ucyIsImNvbmRpdGlvbiIsInJlc3VsdCIsIlJlZ0V4cCIsInRlc3QiLCJ0b0xvd2VyQ2FzZSIsIlByb21pc2UiLCJyZXNvbHZlIiwiVW5rbm93bkVycm9yIiwiaGFuZGxlTG9naW5SZXN1bHQiLCJzY3JhcGVyIiwibG9naW5SZXN1bHQiLCJTdWNjZXNzIiwiZW1pdFByb2dyZXNzIiwiU2NhcGVyUHJvZ3Jlc3NUeXBlcyIsIkxvZ2luU3VjY2VzcyIsInN1Y2Nlc3MiLCJJbnZhbGlkUGFzc3dvcmQiLCJMb2dpbkZhaWxlZCIsImVycm9yVHlwZSIsImVycm9yTWVzc2FnZSIsIkNoYW5nZVBhc3N3b3JkIiwiRXJyb3IiLCJjcmVhdGVHZW5lcmFsRXJyb3IiLCJCYXNlU2NyYXBlcldpdGhCcm93c2VyIiwiQmFzZVNjcmFwZXIiLCJpbml0aWFsaXplIiwiSW5pdGlhbGl6aW5nIiwiZW52Iiwib3B0aW9ucyIsInZlcmJvc2UiLCJERUJVRyIsInByb2Nlc3MiLCJicm93c2VyIiwiZXhlY3V0YWJsZVBhdGgiLCJ1bmRlZmluZWQiLCJhcmdzIiwicHVwcGV0ZWVyIiwibGF1bmNoIiwiaGVhZGxlc3MiLCJzaG93QnJvd3NlciIsInByZXBhcmVCcm93c2VyIiwicGFnZXMiLCJsZW5ndGgiLCJuZXdQYWdlIiwicHJlcGFyZVBhZ2UiLCJzZXRWaWV3cG9ydCIsIndpZHRoIiwiaGVpZ2h0IiwibmF2aWdhdGVUbyIsInVybCIsInBhZ2VUb1VzZSIsInJlc3BvbnNlIiwiZ290byIsInN0YXR1cyIsImdldExvZ2luT3B0aW9ucyIsIl9jcmVkZW50aWFscyIsImNvbXBhbnlJZCIsImZpbGxJbnB1dHMiLCJmaWVsZHMiLCJtb2RpZmllZCIsImlucHV0Iiwic2hpZnQiLCJzZWxlY3RvciIsImxvZ2luIiwiY3JlZGVudGlhbHMiLCJsb2dpbk9wdGlvbnMiLCJsb2dpblVybCIsImNoZWNrUmVhZGluZXNzIiwic3VibWl0QnV0dG9uU2VsZWN0b3IiLCJwcmVBY3Rpb24iLCJMb2dnaW5nSW4iLCJwb3N0QWN0aW9uIiwiY3VycmVudCIsInBvc3NpYmxlUmVzdWx0cyIsInRlcm1pbmF0ZSIsIlRlcm1pbmF0aW5nIiwiY2xvc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUE7O0FBRUE7O0FBS0E7O0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FBRUEsTUFBTUEsY0FBYyxHQUFHLElBQXZCO0FBQ0EsTUFBTUMsZUFBZSxHQUFHLEdBQXhCO0FBQ0EsTUFBTUMsU0FBUyxHQUFHLEdBQWxCO0lBRUtDLGdCOztXQUFBQSxnQjtBQUFBQSxFQUFBQSxnQjtBQUFBQSxFQUFBQSxnQjtHQUFBQSxnQixLQUFBQSxnQjs7QUFLTCxNQUFNO0FBQ0pDLEVBQUFBLE9BREk7QUFDS0MsRUFBQUEsT0FETDtBQUNjQyxFQUFBQTtBQURkLElBRUZDLDhCQUZKO0FBQUEsTUFDZ0NDLElBRGhDLDRCQUVJRCw4QkFGSjs7QUFHTyxNQUFNRSxZQUFZLHFCQUNwQkQsSUFEb0IsTUFFcEJMLGdCQUZvQixDQUFsQjs7OztBQXdCUCxlQUFlTyxhQUFmLENBQTZCQyxNQUE3QixFQUEyREMsS0FBM0QsRUFBMEVDLElBQTFFLEVBQTZHO0FBQzNHLFFBQU1DLElBQUksR0FBR0MsTUFBTSxDQUFDRCxJQUFQLENBQVlILE1BQVosQ0FBYjs7QUFDQSxPQUFLLE1BQU1LLEdBQVgsSUFBa0JGLElBQWxCLEVBQXdCO0FBQ3RCO0FBQ0EsVUFBTUcsVUFBVSxHQUFHTixN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QUFFRCxVQUFNLEtBQUtBLE9BQUwsQ0FBYTRDLEtBQWIsRUFBTjtBQUNEOztBQWhJOEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcHVwcGV0ZWVyLCB7IEJyb3dzZXIsIFBhZ2UgfSBmcm9tICdwdXBwZXRlZXInO1xuXG5pbXBvcnQge1xuICBTY3JhcGVyRXJyb3JUeXBlcyxcbiAgQmFzZVNjcmFwZXIsIFNjYXBlclNjcmFwaW5nUmVzdWx0LCBTY2FwZXJQcm9ncmVzc1R5cGVzLFxuICBTY3JhcGVyQ3JlZGVudGlhbHMsXG59IGZyb20gJy4vYmFzZS1zY3JhcGVyJztcbmltcG9ydCB7IGdldEN1cnJlbnRVcmwsIHdhaXRGb3JOYXZpZ2F0aW9uIH0gZnJvbSAnLi4vaGVscGVycy9uYXZpZ2F0aW9uJztcbmltcG9ydCB7IGNsaWNrQnV0dG9uLCBmaWxsSW5wdXQsIHdhaXRVbnRpbEVsZW1lbnRGb3VuZCB9IGZyb20gJy4uL2hlbHBlcnMvZWxlbWVudHMtaW50ZXJhY3Rpb25zJztcblxuY29uc3QgVklFV1BPUlRfV0lEVEggPSAxMDI0O1xuY29uc3QgVklFV1BPUlRfSEVJR0hUID0gNzY4O1xuY29uc3QgT0tfU1RBVFVTID0gMjAwO1xuXG5lbnVtIExvZ2luQmFzZVJlc3VsdHMge1xuICBTdWNjZXNzID0gJ1NVQ0NFU1MnLFxuICBVbmtub3duRXJyb3IgPSAnVU5LTk9XTl9FUlJPUidcbn1cblxuY29uc3Qge1xuICBUaW1lb3V0LCBHZW5lcmljLCBHZW5lcmFsLCAuLi5yZXN0XG59ID0gU2NyYXBlckVycm9yVHlwZXM7XG5leHBvcnQgY29uc3QgTG9naW5SZXN1bHRzID0ge1xuICAuLi5yZXN0LFxuICAuLi5Mb2dpbkJhc2VSZXN1bHRzLFxufTtcblxuZXhwb3J0IHR5cGUgTG9naW5SZXN1bHRzID0gRXhjbHVkZTxTY3JhcGVyRXJyb3JUeXBlcyxcblNjcmFwZXJFcnJvclR5cGVzLlRpbWVvdXRcbnwgU2NyYXBlckVycm9yVHlwZXMuR2VuZXJpY1xufCBTY3JhcGVyRXJyb3JUeXBlcy5HZW5lcmFsPiB8IExvZ2luQmFzZVJlc3VsdHM7XG5cbmV4cG9ydCB0eXBlIFBvc3NpYmxlTG9naW5SZXN1bHRzID0ge1xuICBba2V5IGluIExvZ2luUmVzdWx0c10/OiAoc3RyaW5nIHwgUmVnRXhwIHwgKChvcHRpb25zPzogeyBwYWdlPzogUGFnZX0pID0+IFByb21pc2U8Ym9vbGVhbj4pKVtdXG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIExvZ2luT3B0aW9ucyB7XG4gIGxvZ2luVXJsOiBzdHJpbmc7XG4gIGNoZWNrUmVhZGluZXNzPzogKCkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgZmllbGRzOiB7c2VsZWN0b3I6IHN0cmluZywgdmFsdWU6IHN0cmluZ31bXTtcbiAgc3VibWl0QnV0dG9uU2VsZWN0b3I6IHN0cmluZztcbiAgcHJlQWN0aW9uPzogKCkgPT4gUHJvbWlzZTx2b2lkPjtcbiAgcG9zdEFjdGlvbj86ICgpID0+IFByb21pc2U8dm9pZD47XG4gIHBvc3NpYmxlUmVzdWx0czogUG9zc2libGVMb2dpblJlc3VsdHM7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEtleUJ5VmFsdWUob2JqZWN0OiBQb3NzaWJsZUxvZ2luUmVzdWx0cywgdmFsdWU6IHN0cmluZywgcGFnZTogUGFnZSk6IFByb21pc2U8TG9naW5SZXN1bHRzPiB7XG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhvYmplY3QpO1xuICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIGNvbnN0IGNvbmRpdGlvbnMgPSBvYmplY3Rba2V5XTtcblxuICAgIGZvciAoY29uc3QgY29uZGl0aW9uIG9mIGNvbmRpdGlvbnMpIHtcbiAgICAgIGxldCByZXN1bHQgPSBmYWxzZTtcblxuICAgICAgaWYgKGNvbmRpdGlvbiBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICByZXN1bHQgPSBjb25kaXRpb24udGVzdCh2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb25kaXRpb24gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgY29uZGl0aW9uKHsgcGFnZSwgdmFsdWUgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZS50b0xvd2VyQ2FzZSgpID09PSBjb25kaXRpb24udG9Mb3dlckNhc2UoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKExvZ2luUmVzdWx0cy5Vbmtub3duRXJyb3IpO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVMb2dpblJlc3VsdChzY3JhcGVyOiBCYXNlU2NyYXBlcldpdGhCcm93c2VyLCBsb2dpblJlc3VsdDogTG9naW5SZXN1bHRzKSB7XG4gIHN3aXRjaCAobG9naW5SZXN1bHQpIHtcbiAgICBjYXNlIExvZ2luUmVzdWx0cy5TdWNjZXNzOlxuICAgICAgc2NyYXBlci5lbWl0UHJvZ3Jlc3MoU2NhcGVyUHJvZ3Jlc3NUeXBlcy5Mb2dpblN1Y2Nlc3MpO1xuICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICAgIGNhc2UgTG9naW5SZXN1bHRzLkludmFsaWRQYXNzd29yZDpcbiAgICBjYXNlIExvZ2luUmVzdWx0cy5Vbmtub3duRXJyb3I6XG4gICAgICBzY3JhcGVyLmVtaXRQcm9ncmVzcyhTY2FwZXJQcm9ncmVzc1R5cGVzLkxvZ2luRmFpbGVkKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBlcnJvclR5cGU6IGxvZ2luUmVzdWx0ID09PSBMb2dpblJlc3VsdHMuSW52YWxpZFBhc3N3b3JkID8gU2NyYXBlckVycm9yVHlwZXMuSW52YWxpZFBhc3N3b3JkIDpcbiAgICAgICAgICBTY3JhcGVyRXJyb3JUeXBlcy5HZW5lcmFsLFxuICAgICAgICBlcnJvck1lc3NhZ2U6IGBMb2dpbiBmYWlsZWQgd2l0aCAke2xvZ2luUmVzdWx0fSBlcnJvcmAsXG4gICAgICB9O1xuICAgIGNhc2UgTG9naW5SZXN1bHRzLkNoYW5nZVBhc3N3b3JkOlxuICAgICAgc2NyYXBlci5lbWl0UHJvZ3Jlc3MoU2NhcGVyUHJvZ3Jlc3NUeXBlcy5DaGFuZ2VQYXNzd29yZCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3JUeXBlOiBTY3JhcGVyRXJyb3JUeXBlcy5DaGFuZ2VQYXNzd29yZCxcbiAgICAgIH07XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgdW5leHBlY3RlZCBsb2dpbiByZXN1bHQgXCIke2xvZ2luUmVzdWx0fVwiYCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlR2VuZXJhbEVycm9yKCk6IFNjYXBlclNjcmFwaW5nUmVzdWx0IHtcbiAgcmV0dXJuIHtcbiAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICBlcnJvclR5cGU6IFNjcmFwZXJFcnJvclR5cGVzLkdlbmVyYWwsXG4gIH07XG59XG5cbmNsYXNzIEJhc2VTY3JhcGVyV2l0aEJyb3dzZXIgZXh0ZW5kcyBCYXNlU2NyYXBlciB7XG4gIC8vIE5PVElDRSAtIGl0IGlzIGRpc2NvdXJhZ2UgdG8gdXNlIGJhbmcgKCEpIGluIGdlbmVyYWwuIEl0IGlzIHVzZWQgaGVyZSBiZWNhdXNlXG4gIC8vIGFsbCB0aGUgY2xhc3NlcyB0aGF0IGluaGVyaXQgZnJvbSB0aGlzIGJhc2UgYXNzdW1lIGlzIGl0IG1hbmRhdG9yeS5cbiAgcHJvdGVjdGVkIGJyb3dzZXIhOiBCcm93c2VyO1xuXG4gIC8vIE5PVElDRSAtIGl0IGlzIGRpc2NvdXJhZ2UgdG8gdXNlIGJhbmcgKCEpIGluIGdlbmVyYWwuIEl0IGlzIHVzZWQgaGVyZSBiZWNhdXNlXG4gIC8vIGFsbCB0aGUgY2xhc3NlcyB0aGF0IGluaGVyaXQgZnJvbSB0aGlzIGJhc2UgYXNzdW1lIGlzIGl0IG1hbmRhdG9yeS5cbiAgcHJvdGVjdGVkIHBhZ2UhOiBQYWdlO1xuXG4gIGFzeW5jIGluaXRpYWxpemUoKSB7XG4gICAgdGhpcy5lbWl0UHJvZ3Jlc3MoU2NhcGVyUHJvZ3Jlc3NUeXBlcy5Jbml0aWFsaXppbmcpO1xuXG4gICAgbGV0IGVudjogUmVjb3JkPHN0cmluZywgYW55PiB8IHVuZGVmaW5lZDtcbiAgICBpZiAodGhpcy5vcHRpb25zLnZlcmJvc2UpIHtcbiAgICAgIGVudiA9IHsgREVCVUc6ICcqJywgLi4ucHJvY2Vzcy5lbnYgfTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRoaXMub3B0aW9ucy5icm93c2VyICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLm9wdGlvbnMuYnJvd3NlciAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5icm93c2VyID0gdGhpcy5vcHRpb25zLmJyb3dzZXI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGV4ZWN1dGFibGVQYXRoID0gdGhpcy5vcHRpb25zLmV4ZWN1dGFibGVQYXRoIHx8IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IGFyZ3MgPSB0aGlzLm9wdGlvbnMuYXJncyB8fCBbXTtcbiAgICAgIHRoaXMuYnJvd3NlciA9IGF3YWl0IHB1cHBldGVlci5sYXVuY2goe1xuICAgICAgICBlbnYsXG4gICAgICAgIGhlYWRsZXNzOiAhdGhpcy5vcHRpb25zLnNob3dCcm93c2VyLFxuICAgICAgICBleGVjdXRhYmxlUGF0aCxcbiAgICAgICAgYXJncyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMucHJlcGFyZUJyb3dzZXIpIHtcbiAgICAgIGF3YWl0IHRoaXMub3B0aW9ucy5wcmVwYXJlQnJvd3Nlcih0aGlzLmJyb3dzZXIpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5icm93c2VyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGFnZXMgPSBhd2FpdCB0aGlzLmJyb3dzZXIucGFnZXMoKTtcbiAgICBpZiAocGFnZXMubGVuZ3RoKSB7XG4gICAgICBbdGhpcy5wYWdlXSA9IHBhZ2VzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBhZ2UgPSBhd2FpdCB0aGlzLmJyb3dzZXIubmV3UGFnZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMucHJlcGFyZVBhZ2UpIHtcbiAgICAgIGF3YWl0IHRoaXMub3B0aW9ucy5wcmVwYXJlUGFnZSh0aGlzLnBhZ2UpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucGFnZS5zZXRWaWV3cG9ydCh7XG4gICAgICB3aWR0aDogVklFV1BPUlRfV0lEVEgsXG4gICAgICBoZWlnaHQ6IFZJRVdQT1JUX0hFSUdIVCxcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIG5hdmlnYXRlVG8odXJsOiBzdHJpbmcsIHBhZ2U/OiBQYWdlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcGFnZVRvVXNlID0gcGFnZSB8fCB0aGlzLnBhZ2U7XG5cbiAgICBpZiAoIXBhZ2VUb1VzZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcGFnZVRvVXNlLmdvdG8odXJsKTtcblxuICAgIC8vIG5vdGU6IHJlc3BvbnNlIHdpbGwgYmUgbnVsbCB3aGVuIG5hdmlnYXRpbmcgdG8gc2FtZSB1cmwgd2hpbGUgY2hhbmdpbmcgdGhlIGhhc2ggcGFydC4gdGhlIGNvbmRpdGlvbiBiZWxvdyB3aWxsIGFsd2F5cyBhY2NlcHQgbnVsbCBhcyB2YWxpZCByZXN1bHQuXG4gICAgaWYgKHJlc3BvbnNlICE9PSBudWxsICYmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IHJlc3BvbnNlLnN0YXR1cygpICE9PSBPS19TVEFUVVMpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIHdoaWxlIHRyeWluZyB0byBuYXZpZ2F0ZSB0byB1cmwgJHt1cmx9YCk7XG4gICAgfVxuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICBnZXRMb2dpbk9wdGlvbnMoX2NyZWRlbnRpYWxzOiBTY3JhcGVyQ3JlZGVudGlhbHMpOiBMb2dpbk9wdGlvbnMge1xuICAgIHRocm93IG5ldyBFcnJvcihgZ2V0TG9naW5PcHRpb25zKCkgaXMgbm90IGNyZWF0ZWQgaW4gJHt0aGlzLm9wdGlvbnMuY29tcGFueUlkfWApO1xuICB9XG5cbiAgYXN5bmMgZmlsbElucHV0cyhmaWVsZHM6IHsgc2VsZWN0b3I6IHN0cmluZywgdmFsdWU6IHN0cmluZ31bXSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IG1vZGlmaWVkID0gWy4uLmZpZWxkc107XG4gICAgY29uc3QgaW5wdXQgPSBtb2RpZmllZC5zaGlmdCgpO1xuXG4gICAgaWYgKCFpbnB1dCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhd2FpdCBmaWxsSW5wdXQodGhpcy5wYWdlLCBpbnB1dC5zZWxlY3RvciwgaW5wdXQudmFsdWUpO1xuICAgIGlmIChtb2RpZmllZC5sZW5ndGgpIHtcbiAgICAgIGF3YWl0IHRoaXMuZmlsbElucHV0cyhtb2RpZmllZCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgbG9naW4oY3JlZGVudGlhbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiBQcm9taXNlPFNjYXBlclNjcmFwaW5nUmVzdWx0PiB7XG4gICAgaWYgKCFjcmVkZW50aWFscyB8fCAhdGhpcy5wYWdlKSB7XG4gICAgICByZXR1cm4gY3JlYXRlR2VuZXJhbEVycm9yKCk7XG4gICAgfVxuXG4gICAgY29uc3QgbG9naW5PcHRpb25zID0gdGhpcy5nZXRMb2dpbk9wdGlvbnMoY3JlZGVudGlhbHMpO1xuXG4gICAgYXdhaXQgdGhpcy5uYXZpZ2F0ZVRvKGxvZ2luT3B0aW9ucy5sb2dpblVybCk7XG4gICAgaWYgKGxvZ2luT3B0aW9ucy5jaGVja1JlYWRpbmVzcykge1xuICAgICAgYXdhaXQgbG9naW5PcHRpb25zLmNoZWNrUmVhZGluZXNzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHdhaXRVbnRpbEVsZW1lbnRGb3VuZCh0aGlzLnBhZ2UsIGxvZ2luT3B0aW9ucy5zdWJtaXRCdXR0b25TZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgaWYgKGxvZ2luT3B0aW9ucy5wcmVBY3Rpb24pIHtcbiAgICAgIGF3YWl0IGxvZ2luT3B0aW9ucy5wcmVBY3Rpb24oKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5maWxsSW5wdXRzKGxvZ2luT3B0aW9ucy5maWVsZHMpO1xuICAgIGF3YWl0IGNsaWNrQnV0dG9uKHRoaXMucGFnZSwgbG9naW5PcHRpb25zLnN1Ym1pdEJ1dHRvblNlbGVjdG9yKTtcbiAgICB0aGlzLmVtaXRQcm9ncmVzcyhTY2FwZXJQcm9ncmVzc1R5cGVzLkxvZ2dpbmdJbik7XG5cbiAgICBpZiAobG9naW5PcHRpb25zLnBvc3RBY3Rpb24pIHtcbiAgICAgIGF3YWl0IGxvZ2luT3B0aW9ucy5wb3N0QWN0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHdhaXRGb3JOYXZpZ2F0aW9uKHRoaXMucGFnZSk7XG4gICAgfVxuXG4gICAgY29uc3QgY3VycmVudCA9IGF3YWl0IGdldEN1cnJlbnRVcmwodGhpcy5wYWdlLCB0cnVlKTtcbiAgICBjb25zdCBsb2dpblJlc3VsdCA9IGF3YWl0IGdldEtleUJ5VmFsdWUobG9naW5PcHRpb25zLnBvc3NpYmxlUmVzdWx0cywgY3VycmVudCwgdGhpcy5wYWdlKTtcbiAgICByZXR1cm4gaGFuZGxlTG9naW5SZXN1bHQodGhpcywgbG9naW5SZXN1bHQpO1xuICB9XG5cbiAgYXN5bmMgdGVybWluYXRlKCkge1xuICAgIHRoaXMuZW1pdFByb2dyZXNzKFNjYXBlclByb2dyZXNzVHlwZXMuVGVybWluYXRpbmcpO1xuXG4gICAgaWYgKCF0aGlzLmJyb3dzZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmJyb3dzZXIuY2xvc2UoKTtcbiAgfVxufVxuXG5leHBvcnQgeyBCYXNlU2NyYXBlcldpdGhCcm93c2VyIH07XG4iXX0=