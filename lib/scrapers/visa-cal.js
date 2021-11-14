"use strict";

require("core-js/modules/es.symbol.description");

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.promise");

require("core-js/modules/es.string.replace");

require("core-js/modules/es.string.trim");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _moment = _interopRequireDefault(require("moment"));

var _baseScraperWithBrowser = require("./base-scraper-with-browser");

var _elementsInteractions = require("../helpers/elements-interactions");

var _transactions = require("../transactions");

var _constants = require("../constants");

var _waiting = require("../helpers/waiting");

var _transactions2 = require("../helpers/transactions");

var _debug = require("../helpers/debug");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const LOGIN_URL = 'https://www.cal-online.co.il/';
const TRANSACTIONS_URL = 'https://services.cal-online.co.il/Card-Holders/Screens/Transactions/Transactions.aspx';
const LONG_DATE_FORMAT = 'DD/MM/YYYY';
const DATE_FORMAT = 'DD/MM/YY';
const InvalidPasswordMessage = 'שם המשתמש או הסיסמה שהוזנו שגויים';
const debug = (0, _debug.getDebug)('visa-cal');

async function getLoginFrame(page) {
  let frame = null;
  debug('wait until login frame found');
  await (0, _waiting.waitUntil)(() => {
    frame = page.frames().find(f => f.url().includes('connect.cal-online')) || null;
    return Promise.resolve(!!frame);
  }, 'wait for iframe with login form', 10000, 1000);

  if (!frame) {
    debug('failed to find login frame for 10 seconds');
    throw new Error('failed to extract login iframe');
  }

  return frame;
}

async function hasInvalidPasswordError(page) {
  const frame = await getLoginFrame(page);
  const errorFound = await (0, _elementsInteractions.elementPresentOnPage)(frame, 'div.general-error > div');
  const errorMessage = errorFound ? await (0, _elementsInteractions.pageEval)(frame, 'div.general-error > div', '', item => {
    return item.innerText;
  }) : '';
  return errorMessage === InvalidPasswordMessage;
}

function getPossibleLoginResults() {
  debug('return possible login results');
  const urls = {
    [_baseScraperWithBrowser.LoginResults.Success]: [/AccountManagement/i],
    [_baseScraperWithBrowser.LoginResults.InvalidPassword]: [async options => {
      const page = options === null || options === void 0 ? void 0 : options.page;

      if (!page) {
        return false;
      }

      return hasInvalidPasswordError(page);
    }] // [LoginResults.AccountBlocked]: [], // TODO add when reaching this scenario
    // [LoginResults.ChangePassword]: [], // TODO add when reaching this scenario

  };
  return urls;
}

function createLoginFields(credentials) {
  debug('create login fields for username and password');
  return [{
    selector: '[formcontrolname="userName"]',
    value: credentials.username
  }, {
    selector: '[formcontrolname="password"]',
    value: credentials.password
  }];
}

function getAmountData(amountStr) {
  const amountStrCln = amountStr.replace(',', '');
  let currency = null;
  let amount = null;

  if (amountStrCln.includes(_constants.SHEKEL_CURRENCY_SYMBOL)) {
    amount = -parseFloat(amountStrCln.replace(_constants.SHEKEL_CURRENCY_SYMBOL, ''));
    currency = _constants.SHEKEL_CURRENCY;
  } else if (amountStrCln.includes(_constants.DOLLAR_CURRENCY_SYMBOL)) {
    amount = -parseFloat(amountStrCln.replace(_constants.DOLLAR_CURRENCY_SYMBOL, ''));
    currency = _constants.DOLLAR_CURRENCY;
  } else {
    const parts = amountStrCln.split(' ');
    amount = -parseFloat(parts[0]);
    [, currency] = parts;
  }

  return {
    amount,
    currency
  };
}

function getTransactionInstallments(memo) {
  const parsedMemo = /תשלום (\d+) מתוך (\d+)/.exec(memo || '');

  if (!parsedMemo || parsedMemo.length === 0) {
    return null;
  }

  return {
    number: parseInt(parsedMemo[1], 10),
    total: parseInt(parsedMemo[2], 10)
  };
}

function convertTransactions(txns) {
  debug(`convert ${txns.length} raw transactions to official Transaction structure`);
  return txns.map(txn => {
    const originalAmountTuple = getAmountData(txn.originalAmount || '');
    const chargedAmountTuple = getAmountData(txn.chargedAmount || '');
    const installments = getTransactionInstallments(txn.memo);
    const txnDate = (0, _moment.default)(txn.date, DATE_FORMAT);
    const processedDateFormat = txn.processedDate.length === 8 ? DATE_FORMAT : txn.processedDate.length === 9 || txn.processedDate.length === 10 ? LONG_DATE_FORMAT : null;

    if (!processedDateFormat) {
      throw new Error('invalid processed date');
    }

    const txnProcessedDate = (0, _moment.default)(txn.processedDate, processedDateFormat);
    const result = {
      type: installments ? _transactions.TransactionTypes.Installments : _transactions.TransactionTypes.Normal,
      status: _transactions.TransactionStatuses.Completed,
      date: installments ? txnDate.add(installments.number - 1, 'month').toISOString() : txnDate.toISOString(),
      processedDate: txnProcessedDate.toISOString(),
      originalAmount: originalAmountTuple.amount,
      originalCurrency: originalAmountTuple.currency,
      chargedAmount: chargedAmountTuple.amount,
      chargedCurrency: chargedAmountTuple.currency,
      description: txn.description || '',
      memo: txn.memo || ''
    };

    if (installments) {
      result.installments = installments;
    }

    return result;
  });
}

async function fetchTransactionsForAccount(page, startDate, accountNumber, scraperOptions) {
  const startDateValue = startDate.format('MM/YYYY');
  const dateSelector = '[id$="FormAreaNoBorder_FormArea_clndrDebitDateScope_TextBox"]';
  const dateHiddenFieldSelector = '[id$="FormAreaNoBorder_FormArea_clndrDebitDateScope_HiddenField"]';
  const buttonSelector = '[id$="FormAreaNoBorder_FormArea_ctlSubmitRequest"]';
  const nextPageSelector = '[id$="FormAreaNoBorder_FormArea_ctlGridPager_btnNext"]';
  const billingLabelSelector = '[id$=FormAreaNoBorder_FormArea_ctlMainToolBar_lblCaption]';
  debug('find the start date index in the dropbox');
  const options = await (0, _elementsInteractions.pageEvalAll)(page, '[id$="FormAreaNoBorder_FormArea_clndrDebitDateScope_OptionList"] li', [], items => {
    return items.map(el => el.innerText);
  });
  const startDateIndex = options.findIndex(option => option === startDateValue);
  debug(`scrape ${options.length - startDateIndex} billing cycles`);
  const accountTransactions = [];

  for (let currentDateIndex = startDateIndex; currentDateIndex < options.length; currentDateIndex += 1) {
    var _$exec;

    debug('wait for date selector to be found');
    await (0, _elementsInteractions.waitUntilElementFound)(page, dateSelector, true);
    debug(`set hidden value of the date selector to be the index ${currentDateIndex}`);
    await (0, _elementsInteractions.setValue)(page, dateHiddenFieldSelector, `${currentDateIndex}`);
    debug('wait a second to workaround navigation issue in headless browser mode');
    await page.waitFor(1000);
    debug('click on the filter submit button and wait for navigation');
    await Promise.all([page.waitForNavigation({
      waitUntil: 'domcontentloaded'
    }), (0, _elementsInteractions.clickButton)(page, buttonSelector)]);
    debug('find the billing date');
    const billingDateLabel = await (0, _elementsInteractions.pageEval)(page, billingLabelSelector, '', element => {
      return element.innerText;
    });
    const billingDate = (_$exec = /\d{1,2}[/]\d{2}[/]\d{2,4}/.exec(billingDateLabel)) === null || _$exec === void 0 ? void 0 : _$exec[0];

    if (!billingDate) {
      throw new Error('failed to fetch process date');
    }

    debug(`found the billing date for that month ${billingDate}`);
    let hasNextPage = false;

    do {
      debug('fetch raw transactions from page');
      const rawTransactions = await (0, _elementsInteractions.pageEvalAll)(page, '#ctlMainGrid > tbody tr, #ctlSecondaryGrid > tbody tr', [], (items, billingDate) => {
        return items.map(el => {
          const columns = el.getElementsByTagName('td');

          if (columns.length === 6) {
            return {
              processedDate: columns[0].innerText,
              date: columns[1].innerText,
              description: columns[2].innerText,
              originalAmount: columns[3].innerText,
              chargedAmount: columns[4].innerText,
              memo: columns[5].innerText
            };
          }

          if (columns.length === 5) {
            return {
              processedDate: billingDate,
              date: columns[0].innerText,
              description: columns[1].innerText,
              originalAmount: columns[2].innerText,
              chargedAmount: columns[3].innerText,
              memo: columns[4].innerText
            };
          }

          return null;
        });
      }, billingDate);
      debug(`fetched ${rawTransactions.length} raw transactions from page`);
      accountTransactions.push(...convertTransactions(rawTransactions.filter(item => !!item)));
      debug('check for existance of another page');
      hasNextPage = await (0, _elementsInteractions.elementPresentOnPage)(page, nextPageSelector);

      if (hasNextPage) {
        debug('has another page, click on button next and wait for page navigation');
        await Promise.all([page.waitForNavigation({
          waitUntil: 'domcontentloaded'
        }), await (0, _elementsInteractions.clickButton)(page, '[id$=FormAreaNoBorder_FormArea_ctlGridPager_btnNext]')]);
      }
    } while (hasNextPage);
  }

  debug('filer out old transactions');
  const txns = (0, _transactions2.filterOldTransactions)(accountTransactions, startDate, scraperOptions.combineInstallments || false);
  debug(`found ${txns.length} valid transactions out of ${accountTransactions.length} transactions for account ending with ${accountNumber.substring(accountNumber.length - 2)}`);
  return {
    accountNumber,
    txns
  };
}

async function getAccountNumbers(page) {
  return (0, _elementsInteractions.pageEvalAll)(page, '[id$=lnkItem]', [], elements => elements.map(e => e.text)).then(res => res.map(text => {
    var _$exec$, _$exec2;

    return (_$exec$ = (_$exec2 = /\d+$/.exec(text.trim())) === null || _$exec2 === void 0 ? void 0 : _$exec2[0]) !== null && _$exec$ !== void 0 ? _$exec$ : '';
  }));
}

async function setAccount(page, account) {
  await (0, _elementsInteractions.pageEvalAll)(page, '[id$=lnkItem]', null, (elements, account) => {
    for (const elem of elements) {
      const a = elem;

      if (a.text.includes(account)) {
        a.click();
      }
    }
  }, account);
}

async function fetchTransactions(page, startDate, scraperOptions) {
  const accountNumbers = await getAccountNumbers(page);
  const accounts = [];

  for (const account of accountNumbers) {
    debug(`setting account: ${account}`);
    await setAccount(page, account);
    await page.waitFor(1000);
    accounts.push((await fetchTransactionsForAccount(page, startDate, account, scraperOptions)));
  }

  return accounts;
}

class VisaCalScraper extends _baseScraperWithBrowser.BaseScraperWithBrowser {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "openLoginPopup", async () => {
      debug('open login popup, wait until login button available');
      await (0, _elementsInteractions.waitUntilElementFound)(this.page, '#ccLoginDesktopBtn', true);
      debug('click on the login button');
      await (0, _elementsInteractions.clickButton)(this.page, '#ccLoginDesktopBtn');
      debug('get the frame that holds the login');
      const frame = await getLoginFrame(this.page);
      debug('wait until the password login tab header is available');
      await (0, _elementsInteractions.waitUntilElementFound)(frame, '#regular-login');
      debug('navigate to the password login tab');
      await (0, _elementsInteractions.clickButton)(frame, '#regular-login');
      debug('wait until the password login tab is active');
      await (0, _elementsInteractions.waitUntilElementFound)(frame, 'regular-login');
      return frame;
    });
  }

  getLoginOptions(credentials) {
    return {
      loginUrl: `${LOGIN_URL}`,
      fields: createLoginFields(credentials),
      submitButtonSelector: 'button[type="submit"]',
      possibleResults: getPossibleLoginResults(),
      checkReadiness: async () => (0, _elementsInteractions.waitUntilElementFound)(this.page, '#ccLoginDesktopBtn'),
      preAction: this.openLoginPopup,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36'
    };
  }

  async fetchData() {
    const defaultStartMoment = (0, _moment.default)().subtract(1, 'years').add(1, 'day');
    const startDate = this.options.startDate || defaultStartMoment.toDate();

    const startMoment = _moment.default.max(defaultStartMoment, (0, _moment.default)(startDate));

    debug(`fetch transactions starting ${startMoment.format()}`);
    debug('navigate to transactions page');
    await this.navigateTo(TRANSACTIONS_URL, undefined, 60000);
    debug('fetch accounts transactions');
    const accounts = await fetchTransactions(this.page, startMoment, this.options);
    debug('return the scraped accounts');
    return {
      success: true,
      accounts
    };
  }

}

var _default = VisaCalScraper;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zY3JhcGVycy92aXNhLWNhbC50cyJdLCJuYW1lcyI6WyJMT0dJTl9VUkwiLCJUUkFOU0FDVElPTlNfVVJMIiwiTE9OR19EQVRFX0ZPUk1BVCIsIkRBVEVfRk9STUFUIiwiSW52YWxpZFBhc3N3b3JkTWVzc2FnZSIsImRlYnVnIiwiZ2V0TG9naW5GcmFtZSIsInBhZ2UiLCJmcmFtZSIsImZyYW1lcyIsImZpbmQiLCJmIiwidXJsIiwiaW5jbHVkZXMiLCJQcm9taXNlIiwicmVzb2x2ZSIsIkVycm9yIiwiaGFzSW52YWxpZFBhc3N3b3JkRXJyb3IiLCJlcnJvckZvdW5kIiwiZXJyb3JNZXNzYWdlIiwiaXRlbSIsImlubmVyVGV4dCIsImdldFBvc3NpYmxlTG9naW5SZXN1bHRzIiwidXJscyIsIkxvZ2luUmVzdWx0cyIsIlN1Y2Nlc3MiLCJJbnZhbGlkUGFzc3dvcmQiLCJvcHRpb25zIiwiY3JlYXRlTG9naW5GaWVsZHMiLCJjcmVkZW50aWFscyIsInNlbGVjdG9yIiwidmFsdWUiLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwiZ2V0QW1vdW50RGF0YSIsImFtb3VudFN0ciIsImFtb3VudFN0ckNsbiIsInJlcGxhY2UiLCJjdXJyZW5jeSIsImFtb3VudCIsIlNIRUtFTF9DVVJSRU5DWV9TWU1CT0wiLCJwYXJzZUZsb2F0IiwiU0hFS0VMX0NVUlJFTkNZIiwiRE9MTEFSX0NVUlJFTkNZX1NZTUJPTCIsIkRPTExBUl9DVVJSRU5DWSIsInBhcnRzIiwic3BsaXQiLCJnZXRUcmFuc2FjdGlvbkluc3RhbGxtZW50cyIsIm1lbW8iLCJwYXJzZWRNZW1vIiwiZXhlYyIsImxlbmd0aCIsIm51bWJlciIsInBhcnNlSW50IiwidG90YWwiLCJjb252ZXJ0VHJhbnNhY3Rpb25zIiwidHhucyIsIm1hcCIsInR4biIsIm9yaWdpbmFsQW1vdW50VHVwbGUiLCJvcmlnaW5hbEFtb3VudCIsImNoYXJnZWRBbW91bnRUdXBsZSIsImNoYXJnZWRBbW91bnQiLCJpbnN0YWxsbWVudHMiLCJ0eG5EYXRlIiwiZGF0ZSIsInByb2Nlc3NlZERhdGVGb3JtYXQiLCJwcm9jZXNzZWREYXRlIiwidHhuUHJvY2Vzc2VkRGF0ZSIsInJlc3VsdCIsInR5cGUiLCJUcmFuc2FjdGlvblR5cGVzIiwiSW5zdGFsbG1lbnRzIiwiTm9ybWFsIiwic3RhdHVzIiwiVHJhbnNhY3Rpb25TdGF0dXNlcyIsIkNvbXBsZXRlZCIsImFkZCIsInRvSVNPU3RyaW5nIiwib3JpZ2luYWxDdXJyZW5jeSIsImNoYXJnZWRDdXJyZW5jeSIsImRlc2NyaXB0aW9uIiwiZmV0Y2hUcmFuc2FjdGlvbnNGb3JBY2NvdW50Iiwic3RhcnREYXRlIiwiYWNjb3VudE51bWJlciIsInNjcmFwZXJPcHRpb25zIiwic3RhcnREYXRlVmFsdWUiLCJmb3JtYXQiLCJkYXRlU2VsZWN0b3IiLCJkYXRlSGlkZGVuRmllbGRTZWxlY3RvciIsImJ1dHRvblNlbGVjdG9yIiwibmV4dFBhZ2VTZWxlY3RvciIsImJpbGxpbmdMYWJlbFNlbGVjdG9yIiwiaXRlbXMiLCJlbCIsInN0YXJ0RGF0ZUluZGV4IiwiZmluZEluZGV4Iiwib3B0aW9uIiwiYWNjb3VudFRyYW5zYWN0aW9ucyIsImN1cnJlbnREYXRlSW5kZXgiLCJ3YWl0Rm9yIiwiYWxsIiwid2FpdEZvck5hdmlnYXRpb24iLCJ3YWl0VW50aWwiLCJiaWxsaW5nRGF0ZUxhYmVsIiwiZWxlbWVudCIsImJpbGxpbmdEYXRlIiwiaGFzTmV4dFBhZ2UiLCJyYXdUcmFuc2FjdGlvbnMiLCJjb2x1bW5zIiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJwdXNoIiwiZmlsdGVyIiwiY29tYmluZUluc3RhbGxtZW50cyIsInN1YnN0cmluZyIsImdldEFjY291bnROdW1iZXJzIiwiZWxlbWVudHMiLCJlIiwidGV4dCIsInRoZW4iLCJyZXMiLCJ0cmltIiwic2V0QWNjb3VudCIsImFjY291bnQiLCJlbGVtIiwiYSIsImNsaWNrIiwiZmV0Y2hUcmFuc2FjdGlvbnMiLCJhY2NvdW50TnVtYmVycyIsImFjY291bnRzIiwiVmlzYUNhbFNjcmFwZXIiLCJCYXNlU2NyYXBlcldpdGhCcm93c2VyIiwiZ2V0TG9naW5PcHRpb25zIiwibG9naW5VcmwiLCJmaWVsZHMiLCJzdWJtaXRCdXR0b25TZWxlY3RvciIsInBvc3NpYmxlUmVzdWx0cyIsImNoZWNrUmVhZGluZXNzIiwicHJlQWN0aW9uIiwib3BlbkxvZ2luUG9wdXAiLCJ1c2VyQWdlbnQiLCJmZXRjaERhdGEiLCJkZWZhdWx0U3RhcnRNb21lbnQiLCJzdWJ0cmFjdCIsInRvRGF0ZSIsInN0YXJ0TW9tZW50IiwibW9tZW50IiwibWF4IiwibmF2aWdhdGVUbyIsInVuZGVmaW5lZCIsInN1Y2Nlc3MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7O0FBRUE7O0FBQ0E7O0FBR0E7O0FBUUE7O0FBR0E7O0FBQ0E7O0FBQ0E7Ozs7OztBQUVBLE1BQU1BLFNBQVMsR0FBRywrQkFBbEI7QUFDQSxNQUFNQyxnQkFBZ0IsR0FBRyx1RkFBekI7QUFDQSxNQUFNQyxnQkFBZ0IsR0FBRyxZQUF6QjtBQUNBLE1BQU1DLFdBQVcsR0FBRyxVQUFwQjtBQUNBLE1BQU1DLHNCQUFzQixHQUFHLG1DQUEvQjtBQUVBLE1BQU1DLEtBQUssR0FBRyxxQkFBUyxVQUFULENBQWQ7O0FBV0EsZUFBZUMsYUFBZixDQUE2QkMsSUFBN0IsRUFBeUM7QUFDdkMsTUFBSUMsS0FBbUIsR0FBRyxJQUExQjtBQUNBSCxFQUFBQSxLQUFLLENBQUMsOEJBQUQsQ0FBTDtBQUNBLFFBQU0sd0JBQVUsTUFBTTtBQUNwQkcsSUFBQUEsS0FBSyxHQUFHRCxJQUFJLENBQ1RFLE1BREssR0FFTEMsSUFGSyxDQUVDQyxDQUFELElBQU9BLENBQUMsQ0FBQ0MsR0FBRixHQUFRQyxRQUFSLENBQWlCLG9CQUFqQixDQUZQLEtBRWtELElBRjFEO0FBR0EsV0FBT0MsT0FBTyxDQUFDQyxPQUFSLENBQWdCLENBQUMsQ0FBQ1AsS0FBbEIsQ0FBUDtBQUNELEdBTEssRUFLSCxpQ0FMRyxFQUtnQyxLQUxoQyxFQUt1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QUFNRixpQkFBaUIsQ0FBQyxLQUFLeEgsSUFBTixFQUFZMEksV0FBWixFQUF5QixLQUFLdEgsT0FBOUIsQ0FBeEM7QUFDQXRCLElBQUFBLEtBQUssQ0FBQyw2QkFBRCxDQUFMO0FBQ0EsV0FBTztBQUNMaUosTUFBQUEsT0FBTyxFQUFFLElBREo7QUFFTHJCLE1BQUFBO0FBRkssS0FBUDtBQUlEOztBQTlDaUQ7O2VBaURyQ0MsYyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBtb21lbnQsIHsgTW9tZW50IH0gZnJvbSAnbW9tZW50JztcbmltcG9ydCB7IEZyYW1lLCBQYWdlIH0gZnJvbSAncHVwcGV0ZWVyJztcbmltcG9ydCB7IEJhc2VTY3JhcGVyV2l0aEJyb3dzZXIsIExvZ2luT3B0aW9ucywgTG9naW5SZXN1bHRzIH0gZnJvbSAnLi9iYXNlLXNjcmFwZXItd2l0aC1icm93c2VyJztcbmltcG9ydCB7XG4gIGNsaWNrQnV0dG9uLCBlbGVtZW50UHJlc2VudE9uUGFnZSwgcGFnZUV2YWwsIHBhZ2VFdmFsQWxsLCBzZXRWYWx1ZSwgd2FpdFVudGlsRWxlbWVudEZvdW5kLFxufSBmcm9tICcuLi9oZWxwZXJzL2VsZW1lbnRzLWludGVyYWN0aW9ucyc7XG5pbXBvcnQge1xuICBUcmFuc2FjdGlvbixcbiAgVHJhbnNhY3Rpb25JbnN0YWxsbWVudHMsXG4gIFRyYW5zYWN0aW9uc0FjY291bnQsXG4gIFRyYW5zYWN0aW9uU3RhdHVzZXMsXG4gIFRyYW5zYWN0aW9uVHlwZXMsXG59IGZyb20gJy4uL3RyYW5zYWN0aW9ucyc7XG5pbXBvcnQgeyBTY2FwZXJPcHRpb25zLCBTY2FwZXJTY3JhcGluZ1Jlc3VsdCwgU2NyYXBlckNyZWRlbnRpYWxzIH0gZnJvbSAnLi9iYXNlLXNjcmFwZXInO1xuaW1wb3J0IHtcbiAgRE9MTEFSX0NVUlJFTkNZLCBET0xMQVJfQ1VSUkVOQ1lfU1lNQk9MLCBTSEVLRUxfQ1VSUkVOQ1ksIFNIRUtFTF9DVVJSRU5DWV9TWU1CT0wsXG59IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQgeyB3YWl0VW50aWwgfSBmcm9tICcuLi9oZWxwZXJzL3dhaXRpbmcnO1xuaW1wb3J0IHsgZmlsdGVyT2xkVHJhbnNhY3Rpb25zIH0gZnJvbSAnLi4vaGVscGVycy90cmFuc2FjdGlvbnMnO1xuaW1wb3J0IHsgZ2V0RGVidWcgfSBmcm9tICcuLi9oZWxwZXJzL2RlYnVnJztcblxuY29uc3QgTE9HSU5fVVJMID0gJ2h0dHBzOi8vd3d3LmNhbC1vbmxpbmUuY28uaWwvJztcbmNvbnN0IFRSQU5TQUNUSU9OU19VUkwgPSAnaHR0cHM6Ly9zZXJ2aWNlcy5jYWwtb25saW5lLmNvLmlsL0NhcmQtSG9sZGVycy9TY3JlZW5zL1RyYW5zYWN0aW9ucy9UcmFuc2FjdGlvbnMuYXNweCc7XG5jb25zdCBMT05HX0RBVEVfRk9STUFUID0gJ0REL01NL1lZWVknO1xuY29uc3QgREFURV9GT1JNQVQgPSAnREQvTU0vWVknO1xuY29uc3QgSW52YWxpZFBhc3N3b3JkTWVzc2FnZSA9ICfXqdedINeU157Xqdeq157XqSDXkNeVINeU16HXmdeh157XlCDXqdeU15XXlteg15Ug16nXkteV15nXmdedJztcblxuY29uc3QgZGVidWcgPSBnZXREZWJ1ZygndmlzYS1jYWwnKTtcblxuaW50ZXJmYWNlIFNjcmFwZWRUcmFuc2FjdGlvbiB7XG4gIGRhdGU6IHN0cmluZztcbiAgcHJvY2Vzc2VkRGF0ZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBvcmlnaW5hbEFtb3VudDogc3RyaW5nO1xuICBjaGFyZ2VkQW1vdW50OiBzdHJpbmc7XG4gIG1lbW86IHN0cmluZztcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0TG9naW5GcmFtZShwYWdlOiBQYWdlKSB7XG4gIGxldCBmcmFtZTogRnJhbWUgfCBudWxsID0gbnVsbDtcbiAgZGVidWcoJ3dhaXQgdW50aWwgbG9naW4gZnJhbWUgZm91bmQnKTtcbiAgYXdhaXQgd2FpdFVudGlsKCgpID0+IHtcbiAgICBmcmFtZSA9IHBhZ2VcbiAgICAgIC5mcmFtZXMoKVxuICAgICAgLmZpbmQoKGYpID0+IGYudXJsKCkuaW5jbHVkZXMoJ2Nvbm5lY3QuY2FsLW9ubGluZScpKSB8fCBudWxsO1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoISFmcmFtZSk7XG4gIH0sICd3YWl0IGZvciBpZnJhbWUgd2l0aCBsb2dpbiBmb3JtJywgMTAwMDAsIDEwMDApO1xuXG4gIGlmICghZnJhbWUpIHtcbiAgICBkZWJ1ZygnZmFpbGVkIHRvIGZpbmQgbG9naW4gZnJhbWUgZm9yIDEwIHNlY29uZHMnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ZhaWxlZCB0byBleHRyYWN0IGxvZ2luIGlmcmFtZScpO1xuICB9XG5cbiAgcmV0dXJuIGZyYW1lO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYXNJbnZhbGlkUGFzc3dvcmRFcnJvcihwYWdlOiBQYWdlKSB7XG4gIGNvbnN0IGZyYW1lID0gYXdhaXQgZ2V0TG9naW5GcmFtZShwYWdlKTtcbiAgY29uc3QgZXJyb3JGb3VuZCA9IGF3YWl0IGVsZW1lbnRQcmVzZW50T25QYWdlKGZyYW1lLCAnZGl2LmdlbmVyYWwtZXJyb3IgPiBkaXYnKTtcbiAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3JGb3VuZCA/IGF3YWl0IHBhZ2VFdmFsKGZyYW1lLCAnZGl2LmdlbmVyYWwtZXJyb3IgPiBkaXYnLCAnJywgKGl0ZW0pID0+IHtcbiAgICByZXR1cm4gKGl0ZW0gYXMgSFRNTERpdkVsZW1lbnQpLmlubmVyVGV4dDtcbiAgfSkgOiAnJztcbiAgcmV0dXJuIGVycm9yTWVzc2FnZSA9PT0gSW52YWxpZFBhc3N3b3JkTWVzc2FnZTtcbn1cblxuZnVuY3Rpb24gZ2V0UG9zc2libGVMb2dpblJlc3VsdHMoKSB7XG4gIGRlYnVnKCdyZXR1cm4gcG9zc2libGUgbG9naW4gcmVzdWx0cycpO1xuICBjb25zdCB1cmxzOiBMb2dpbk9wdGlvbnNbJ3Bvc3NpYmxlUmVzdWx0cyddID0ge1xuICAgIFtMb2dpblJlc3VsdHMuU3VjY2Vzc106IFsvQWNjb3VudE1hbmFnZW1lbnQvaV0sXG4gICAgW0xvZ2luUmVzdWx0cy5JbnZhbGlkUGFzc3dvcmRdOiBbYXN5bmMgKG9wdGlvbnM/OiB7IHBhZ2U/OiBQYWdlfSkgPT4ge1xuICAgICAgY29uc3QgcGFnZSA9IG9wdGlvbnM/LnBhZ2U7XG4gICAgICBpZiAoIXBhZ2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGhhc0ludmFsaWRQYXNzd29yZEVycm9yKHBhZ2UpO1xuICAgIH1dLFxuICAgIC8vIFtMb2dpblJlc3VsdHMuQWNjb3VudEJsb2NrZWRdOiBbXSwgLy8gVE9ETyBhZGQgd2hlbiByZWFjaGluZyB0aGlzIHNjZW5hcmlvXG4gICAgLy8gW0xvZ2luUmVzdWx0cy5DaGFuZ2VQYXNzd29yZF06IFtdLCAvLyBUT0RPIGFkZCB3aGVuIHJlYWNoaW5nIHRoaXMgc2NlbmFyaW9cbiAgfTtcbiAgcmV0dXJuIHVybHM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUxvZ2luRmllbGRzKGNyZWRlbnRpYWxzOiBTY3JhcGVyQ3JlZGVudGlhbHMpIHtcbiAgZGVidWcoJ2NyZWF0ZSBsb2dpbiBmaWVsZHMgZm9yIHVzZXJuYW1lIGFuZCBwYXNzd29yZCcpO1xuICByZXR1cm4gW1xuICAgIHsgc2VsZWN0b3I6ICdbZm9ybWNvbnRyb2xuYW1lPVwidXNlck5hbWVcIl0nLCB2YWx1ZTogY3JlZGVudGlhbHMudXNlcm5hbWUgfSxcbiAgICB7IHNlbGVjdG9yOiAnW2Zvcm1jb250cm9sbmFtZT1cInBhc3N3b3JkXCJdJywgdmFsdWU6IGNyZWRlbnRpYWxzLnBhc3N3b3JkIH0sXG4gIF07XG59XG5cblxuZnVuY3Rpb24gZ2V0QW1vdW50RGF0YShhbW91bnRTdHI6IHN0cmluZykge1xuICBjb25zdCBhbW91bnRTdHJDbG4gPSBhbW91bnRTdHIucmVwbGFjZSgnLCcsICcnKTtcbiAgbGV0IGN1cnJlbmN5OiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgbGV0IGFtb3VudDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG4gIGlmIChhbW91bnRTdHJDbG4uaW5jbHVkZXMoU0hFS0VMX0NVUlJFTkNZX1NZTUJPTCkpIHtcbiAgICBhbW91bnQgPSAtcGFyc2VGbG9hdChhbW91bnRTdHJDbG4ucmVwbGFjZShTSEVLRUxfQ1VSUkVOQ1lfU1lNQk9MLCAnJykpO1xuICAgIGN1cnJlbmN5ID0gU0hFS0VMX0NVUlJFTkNZO1xuICB9IGVsc2UgaWYgKGFtb3VudFN0ckNsbi5pbmNsdWRlcyhET0xMQVJfQ1VSUkVOQ1lfU1lNQk9MKSkge1xuICAgIGFtb3VudCA9IC1wYXJzZUZsb2F0KGFtb3VudFN0ckNsbi5yZXBsYWNlKERPTExBUl9DVVJSRU5DWV9TWU1CT0wsICcnKSk7XG4gICAgY3VycmVuY3kgPSBET0xMQVJfQ1VSUkVOQ1k7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcGFydHMgPSBhbW91bnRTdHJDbG4uc3BsaXQoJyAnKTtcbiAgICBhbW91bnQgPSAtcGFyc2VGbG9hdChwYXJ0c1swXSk7XG4gICAgWywgY3VycmVuY3ldID0gcGFydHM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFtb3VudCxcbiAgICBjdXJyZW5jeSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0VHJhbnNhY3Rpb25JbnN0YWxsbWVudHMobWVtbzogc3RyaW5nKTogVHJhbnNhY3Rpb25JbnN0YWxsbWVudHMgfCBudWxsIHtcbiAgY29uc3QgcGFyc2VkTWVtbyA9ICgv16rXqdec15XXnSAoXFxkKykg157XqteV15ogKFxcZCspLykuZXhlYyhtZW1vIHx8ICcnKTtcblxuICBpZiAoIXBhcnNlZE1lbW8gfHwgcGFyc2VkTWVtby5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbnVtYmVyOiBwYXJzZUludChwYXJzZWRNZW1vWzFdLCAxMCksXG4gICAgdG90YWw6IHBhcnNlSW50KHBhcnNlZE1lbW9bMl0sIDEwKSxcbiAgfTtcbn1cbmZ1bmN0aW9uIGNvbnZlcnRUcmFuc2FjdGlvbnModHhuczogU2NyYXBlZFRyYW5zYWN0aW9uW10pOiBUcmFuc2FjdGlvbltdIHtcbiAgZGVidWcoYGNvbnZlcnQgJHt0eG5zLmxlbmd0aH0gcmF3IHRyYW5zYWN0aW9ucyB0byBvZmZpY2lhbCBUcmFuc2FjdGlvbiBzdHJ1Y3R1cmVgKTtcbiAgcmV0dXJuIHR4bnMubWFwKCh0eG4pID0+IHtcbiAgICBjb25zdCBvcmlnaW5hbEFtb3VudFR1cGxlID0gZ2V0QW1vdW50RGF0YSh0eG4ub3JpZ2luYWxBbW91bnQgfHwgJycpO1xuICAgIGNvbnN0IGNoYXJnZWRBbW91bnRUdXBsZSA9IGdldEFtb3VudERhdGEodHhuLmNoYXJnZWRBbW91bnQgfHwgJycpO1xuXG4gICAgY29uc3QgaW5zdGFsbG1lbnRzID0gZ2V0VHJhbnNhY3Rpb25JbnN0YWxsbWVudHModHhuLm1lbW8pO1xuICAgIGNvbnN0IHR4bkRhdGUgPSBtb21lbnQodHhuLmRhdGUsIERBVEVfRk9STUFUKTtcbiAgICBjb25zdCBwcm9jZXNzZWREYXRlRm9ybWF0ID1cbiAgICAgIHR4bi5wcm9jZXNzZWREYXRlLmxlbmd0aCA9PT0gOCA/XG4gICAgICAgIERBVEVfRk9STUFUIDpcbiAgICAgICAgdHhuLnByb2Nlc3NlZERhdGUubGVuZ3RoID09PSA5IHx8IHR4bi5wcm9jZXNzZWREYXRlLmxlbmd0aCA9PT0gMTAgP1xuICAgICAgICAgIExPTkdfREFURV9GT1JNQVQgOlxuICAgICAgICAgIG51bGw7XG4gICAgaWYgKCFwcm9jZXNzZWREYXRlRm9ybWF0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgcHJvY2Vzc2VkIGRhdGUnKTtcbiAgICB9XG4gICAgY29uc3QgdHhuUHJvY2Vzc2VkRGF0ZSA9IG1vbWVudCh0eG4ucHJvY2Vzc2VkRGF0ZSwgcHJvY2Vzc2VkRGF0ZUZvcm1hdCk7XG5cbiAgICBjb25zdCByZXN1bHQ6IFRyYW5zYWN0aW9uID0ge1xuICAgICAgdHlwZTogaW5zdGFsbG1lbnRzID8gVHJhbnNhY3Rpb25UeXBlcy5JbnN0YWxsbWVudHMgOiBUcmFuc2FjdGlvblR5cGVzLk5vcm1hbCxcbiAgICAgIHN0YXR1czogVHJhbnNhY3Rpb25TdGF0dXNlcy5Db21wbGV0ZWQsXG4gICAgICBkYXRlOiBpbnN0YWxsbWVudHMgPyB0eG5EYXRlLmFkZChpbnN0YWxsbWVudHMubnVtYmVyIC0gMSwgJ21vbnRoJykudG9JU09TdHJpbmcoKSA6IHR4bkRhdGUudG9JU09TdHJpbmcoKSxcbiAgICAgIHByb2Nlc3NlZERhdGU6IHR4blByb2Nlc3NlZERhdGUudG9JU09TdHJpbmcoKSxcbiAgICAgIG9yaWdpbmFsQW1vdW50OiBvcmlnaW5hbEFtb3VudFR1cGxlLmFtb3VudCxcbiAgICAgIG9yaWdpbmFsQ3VycmVuY3k6IG9yaWdpbmFsQW1vdW50VHVwbGUuY3VycmVuY3ksXG4gICAgICBjaGFyZ2VkQW1vdW50OiBjaGFyZ2VkQW1vdW50VHVwbGUuYW1vdW50LFxuICAgICAgY2hhcmdlZEN1cnJlbmN5OiBjaGFyZ2VkQW1vdW50VHVwbGUuY3VycmVuY3ksXG4gICAgICBkZXNjcmlwdGlvbjogdHhuLmRlc2NyaXB0aW9uIHx8ICcnLFxuICAgICAgbWVtbzogdHhuLm1lbW8gfHwgJycsXG4gICAgfTtcblxuICAgIGlmIChpbnN0YWxsbWVudHMpIHtcbiAgICAgIHJlc3VsdC5pbnN0YWxsbWVudHMgPSBpbnN0YWxsbWVudHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoVHJhbnNhY3Rpb25zRm9yQWNjb3VudChwYWdlOiBQYWdlLCBzdGFydERhdGU6IE1vbWVudCwgYWNjb3VudE51bWJlcjogc3RyaW5nLCBzY3JhcGVyT3B0aW9uczogU2NhcGVyT3B0aW9ucyk6IFByb21pc2U8VHJhbnNhY3Rpb25zQWNjb3VudD4ge1xuICBjb25zdCBzdGFydERhdGVWYWx1ZSA9IHN0YXJ0RGF0ZS5mb3JtYXQoJ01NL1lZWVknKTtcbiAgY29uc3QgZGF0ZVNlbGVjdG9yID0gJ1tpZCQ9XCJGb3JtQXJlYU5vQm9yZGVyX0Zvcm1BcmVhX2NsbmRyRGViaXREYXRlU2NvcGVfVGV4dEJveFwiXSc7XG4gIGNvbnN0IGRhdGVIaWRkZW5GaWVsZFNlbGVjdG9yID0gJ1tpZCQ9XCJGb3JtQXJlYU5vQm9yZGVyX0Zvcm1BcmVhX2NsbmRyRGViaXREYXRlU2NvcGVfSGlkZGVuRmllbGRcIl0nO1xuICBjb25zdCBidXR0b25TZWxlY3RvciA9ICdbaWQkPVwiRm9ybUFyZWFOb0JvcmRlcl9Gb3JtQXJlYV9jdGxTdWJtaXRSZXF1ZXN0XCJdJztcbiAgY29uc3QgbmV4dFBhZ2VTZWxlY3RvciA9ICdbaWQkPVwiRm9ybUFyZWFOb0JvcmRlcl9Gb3JtQXJlYV9jdGxHcmlkUGFnZXJfYnRuTmV4dFwiXSc7XG4gIGNvbnN0IGJpbGxpbmdMYWJlbFNlbGVjdG9yID0gJ1tpZCQ9Rm9ybUFyZWFOb0JvcmRlcl9Gb3JtQXJlYV9jdGxNYWluVG9vbEJhcl9sYmxDYXB0aW9uXSc7XG5cbiAgZGVidWcoJ2ZpbmQgdGhlIHN0YXJ0IGRhdGUgaW5kZXggaW4gdGhlIGRyb3Bib3gnKTtcbiAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IHBhZ2VFdmFsQWxsKHBhZ2UsICdbaWQkPVwiRm9ybUFyZWFOb0JvcmRlcl9Gb3JtQXJlYV9jbG5kckRlYml0RGF0ZVNjb3BlX09wdGlvbkxpc3RcIl0gbGknLCBbXSwgKGl0ZW1zKSA9PiB7XG4gICAgcmV0dXJuIGl0ZW1zLm1hcCgoZWw6IGFueSkgPT4gZWwuaW5uZXJUZXh0KTtcbiAgfSk7XG4gIGNvbnN0IHN0YXJ0RGF0ZUluZGV4ID0gb3B0aW9ucy5maW5kSW5kZXgoKG9wdGlvbikgPT4gb3B0aW9uID09PSBzdGFydERhdGVWYWx1ZSk7XG5cbiAgZGVidWcoYHNjcmFwZSAke29wdGlvbnMubGVuZ3RoIC0gc3RhcnREYXRlSW5kZXh9IGJpbGxpbmcgY3ljbGVzYCk7XG4gIGNvbnN0IGFjY291bnRUcmFuc2FjdGlvbnM6IFRyYW5zYWN0aW9uW10gPSBbXTtcbiAgZm9yIChsZXQgY3VycmVudERhdGVJbmRleCA9IHN0YXJ0RGF0ZUluZGV4OyBjdXJyZW50RGF0ZUluZGV4IDwgb3B0aW9ucy5sZW5ndGg7IGN1cnJlbnREYXRlSW5kZXggKz0gMSkge1xuICAgIGRlYnVnKCd3YWl0IGZvciBkYXRlIHNlbGVjdG9yIHRvIGJlIGZvdW5kJyk7XG4gICAgYXdhaXQgd2FpdFVudGlsRWxlbWVudEZvdW5kKHBhZ2UsIGRhdGVTZWxlY3RvciwgdHJ1ZSk7XG4gICAgZGVidWcoYHNldCBoaWRkZW4gdmFsdWUgb2YgdGhlIGRhdGUgc2VsZWN0b3IgdG8gYmUgdGhlIGluZGV4ICR7Y3VycmVudERhdGVJbmRleH1gKTtcbiAgICBhd2FpdCBzZXRWYWx1ZShwYWdlLCBkYXRlSGlkZGVuRmllbGRTZWxlY3RvciwgYCR7Y3VycmVudERhdGVJbmRleH1gKTtcbiAgICBkZWJ1Zygnd2FpdCBhIHNlY29uZCB0byB3b3JrYXJvdW5kIG5hdmlnYXRpb24gaXNzdWUgaW4gaGVhZGxlc3MgYnJvd3NlciBtb2RlJyk7XG4gICAgYXdhaXQgcGFnZS53YWl0Rm9yKDEwMDApO1xuICAgIGRlYnVnKCdjbGljayBvbiB0aGUgZmlsdGVyIHN1Ym1pdCBidXR0b24gYW5kIHdhaXQgZm9yIG5hdmlnYXRpb24nKTtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICBwYWdlLndhaXRGb3JOYXZpZ2F0aW9uKHsgd2FpdFVudGlsOiAnZG9tY29udGVudGxvYWRlZCcgfSksXG4gICAgICBjbGlja0J1dHRvbihwYWdlLCBidXR0b25TZWxlY3RvciksXG4gICAgXSk7XG4gICAgZGVidWcoJ2ZpbmQgdGhlIGJpbGxpbmcgZGF0ZScpO1xuICAgIGNvbnN0IGJpbGxpbmdEYXRlTGFiZWwgPSBhd2FpdCBwYWdlRXZhbChwYWdlLCBiaWxsaW5nTGFiZWxTZWxlY3RvciwgJycsICgoZWxlbWVudCkgPT4ge1xuICAgICAgcmV0dXJuIChlbGVtZW50IGFzIEhUTUxTcGFuRWxlbWVudCkuaW5uZXJUZXh0O1xuICAgIH0pKTtcblxuICAgIGNvbnN0IGJpbGxpbmdEYXRlID0gL1xcZHsxLDJ9Wy9dXFxkezJ9Wy9dXFxkezIsNH0vLmV4ZWMoYmlsbGluZ0RhdGVMYWJlbCk/LlswXTtcblxuICAgIGlmICghYmlsbGluZ0RhdGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignZmFpbGVkIHRvIGZldGNoIHByb2Nlc3MgZGF0ZScpO1xuICAgIH1cblxuICAgIGRlYnVnKGBmb3VuZCB0aGUgYmlsbGluZyBkYXRlIGZvciB0aGF0IG1vbnRoICR7YmlsbGluZ0RhdGV9YCk7XG4gICAgbGV0IGhhc05leHRQYWdlID0gZmFsc2U7XG4gICAgZG8ge1xuICAgICAgZGVidWcoJ2ZldGNoIHJhdyB0cmFuc2FjdGlvbnMgZnJvbSBwYWdlJyk7XG4gICAgICBjb25zdCByYXdUcmFuc2FjdGlvbnMgPSBhd2FpdCBwYWdlRXZhbEFsbDwoU2NyYXBlZFRyYW5zYWN0aW9uIHwgbnVsbClbXT4ocGFnZSwgJyNjdGxNYWluR3JpZCA+IHRib2R5IHRyLCAjY3RsU2Vjb25kYXJ5R3JpZCA+IHRib2R5IHRyJywgW10sIChpdGVtcywgYmlsbGluZ0RhdGUpID0+IHtcbiAgICAgICAgcmV0dXJuIChpdGVtcykubWFwKChlbCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGNvbHVtbnMgPSBlbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgndGQnKTtcbiAgICAgICAgICBpZiAoY29sdW1ucy5sZW5ndGggPT09IDYpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHByb2Nlc3NlZERhdGU6IGNvbHVtbnNbMF0uaW5uZXJUZXh0LFxuICAgICAgICAgICAgICBkYXRlOiBjb2x1bW5zWzFdLmlubmVyVGV4dCxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGNvbHVtbnNbMl0uaW5uZXJUZXh0LFxuICAgICAgICAgICAgICBvcmlnaW5hbEFtb3VudDogY29sdW1uc1szXS5pbm5lclRleHQsXG4gICAgICAgICAgICAgIGNoYXJnZWRBbW91bnQ6IGNvbHVtbnNbNF0uaW5uZXJUZXh0LFxuICAgICAgICAgICAgICBtZW1vOiBjb2x1bW5zWzVdLmlubmVyVGV4dCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSBpZiAoY29sdW1ucy5sZW5ndGggPT09IDUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHByb2Nlc3NlZERhdGU6IGJpbGxpbmdEYXRlLFxuICAgICAgICAgICAgICBkYXRlOiBjb2x1bW5zWzBdLmlubmVyVGV4dCxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGNvbHVtbnNbMV0uaW5uZXJUZXh0LFxuICAgICAgICAgICAgICBvcmlnaW5hbEFtb3VudDogY29sdW1uc1syXS5pbm5lclRleHQsXG4gICAgICAgICAgICAgIGNoYXJnZWRBbW91bnQ6IGNvbHVtbnNbM10uaW5uZXJUZXh0LFxuICAgICAgICAgICAgICBtZW1vOiBjb2x1bW5zWzRdLmlubmVyVGV4dCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH0sIGJpbGxpbmdEYXRlKTtcbiAgICAgIGRlYnVnKGBmZXRjaGVkICR7cmF3VHJhbnNhY3Rpb25zLmxlbmd0aH0gcmF3IHRyYW5zYWN0aW9ucyBmcm9tIHBhZ2VgKTtcbiAgICAgIGFjY291bnRUcmFuc2FjdGlvbnMucHVzaCguLi5jb252ZXJ0VHJhbnNhY3Rpb25zKChyYXdUcmFuc2FjdGlvbnMgYXMgU2NyYXBlZFRyYW5zYWN0aW9uW10pXG4gICAgICAgIC5maWx0ZXIoKGl0ZW0pID0+ICEhaXRlbSkpKTtcblxuICAgICAgZGVidWcoJ2NoZWNrIGZvciBleGlzdGFuY2Ugb2YgYW5vdGhlciBwYWdlJyk7XG4gICAgICBoYXNOZXh0UGFnZSA9IGF3YWl0IGVsZW1lbnRQcmVzZW50T25QYWdlKHBhZ2UsIG5leHRQYWdlU2VsZWN0b3IpO1xuICAgICAgaWYgKGhhc05leHRQYWdlKSB7XG4gICAgICAgIGRlYnVnKCdoYXMgYW5vdGhlciBwYWdlLCBjbGljayBvbiBidXR0b24gbmV4dCBhbmQgd2FpdCBmb3IgcGFnZSBuYXZpZ2F0aW9uJyk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICBwYWdlLndhaXRGb3JOYXZpZ2F0aW9uKHsgd2FpdFVudGlsOiAnZG9tY29udGVudGxvYWRlZCcgfSksXG4gICAgICAgICAgYXdhaXQgY2xpY2tCdXR0b24ocGFnZSwgJ1tpZCQ9Rm9ybUFyZWFOb0JvcmRlcl9Gb3JtQXJlYV9jdGxHcmlkUGFnZXJfYnRuTmV4dF0nKSxcbiAgICAgICAgXSk7XG4gICAgICB9XG4gICAgfSB3aGlsZSAoaGFzTmV4dFBhZ2UpO1xuICB9XG5cbiAgZGVidWcoJ2ZpbGVyIG91dCBvbGQgdHJhbnNhY3Rpb25zJyk7XG4gIGNvbnN0IHR4bnMgPSBmaWx0ZXJPbGRUcmFuc2FjdGlvbnMoYWNjb3VudFRyYW5zYWN0aW9ucywgc3RhcnREYXRlLCBzY3JhcGVyT3B0aW9ucy5jb21iaW5lSW5zdGFsbG1lbnRzIHx8IGZhbHNlKTtcbiAgZGVidWcoYGZvdW5kICR7dHhucy5sZW5ndGh9IHZhbGlkIHRyYW5zYWN0aW9ucyBvdXQgb2YgJHthY2NvdW50VHJhbnNhY3Rpb25zLmxlbmd0aH0gdHJhbnNhY3Rpb25zIGZvciBhY2NvdW50IGVuZGluZyB3aXRoICR7YWNjb3VudE51bWJlci5zdWJzdHJpbmcoYWNjb3VudE51bWJlci5sZW5ndGggLSAyKX1gKTtcbiAgcmV0dXJuIHtcbiAgICBhY2NvdW50TnVtYmVyLFxuICAgIHR4bnMsXG4gIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEFjY291bnROdW1iZXJzKHBhZ2U6IFBhZ2UpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gIHJldHVybiBwYWdlRXZhbEFsbChwYWdlLCAnW2lkJD1sbmtJdGVtXScsIFtdLCAoZWxlbWVudHMpID0+IGVsZW1lbnRzLm1hcCgoZSkgPT4gKGUgYXMgSFRNTEFuY2hvckVsZW1lbnQpLnRleHQpKS50aGVuKChyZXMpID0+IHJlcy5tYXAoKHRleHQpID0+IC9cXGQrJC8uZXhlYyh0ZXh0LnRyaW0oKSk/LlswXSA/PyAnJykpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzZXRBY2NvdW50KHBhZ2U6IFBhZ2UsIGFjY291bnQ6IHN0cmluZykge1xuICBhd2FpdCBwYWdlRXZhbEFsbChcbiAgICBwYWdlLFxuICAgICdbaWQkPWxua0l0ZW1dJyxcbiAgICBudWxsLFxuICAgIChlbGVtZW50cywgYWNjb3VudCkgPT4ge1xuICAgICAgZm9yIChjb25zdCBlbGVtIG9mIGVsZW1lbnRzKSB7XG4gICAgICAgIGNvbnN0IGEgPSBlbGVtIGFzIEhUTUxBbmNob3JFbGVtZW50O1xuICAgICAgICBpZiAoYS50ZXh0LmluY2x1ZGVzKGFjY291bnQpKSB7XG4gICAgICAgICAgYS5jbGljaygpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBhY2NvdW50LFxuICApO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFRyYW5zYWN0aW9ucyhwYWdlOiBQYWdlLCBzdGFydERhdGU6IE1vbWVudCwgc2NyYXBlck9wdGlvbnM6IFNjYXBlck9wdGlvbnMpOiBQcm9taXNlPFRyYW5zYWN0aW9uc0FjY291bnRbXT4ge1xuICBjb25zdCBhY2NvdW50TnVtYmVyczogc3RyaW5nW10gPSBhd2FpdCBnZXRBY2NvdW50TnVtYmVycyhwYWdlKTtcbiAgY29uc3QgYWNjb3VudHM6IFRyYW5zYWN0aW9uc0FjY291bnRbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgYWNjb3VudCBvZiBhY2NvdW50TnVtYmVycykge1xuICAgIGRlYnVnKGBzZXR0aW5nIGFjY291bnQ6ICR7YWNjb3VudH1gKTtcbiAgICBhd2FpdCBzZXRBY2NvdW50KHBhZ2UsIGFjY291bnQpO1xuICAgIGF3YWl0IHBhZ2Uud2FpdEZvcigxMDAwKTtcbiAgICBhY2NvdW50cy5wdXNoKFxuICAgICAgYXdhaXQgZmV0Y2hUcmFuc2FjdGlvbnNGb3JBY2NvdW50KFxuICAgICAgICBwYWdlLFxuICAgICAgICBzdGFydERhdGUsXG4gICAgICAgIGFjY291bnQsXG4gICAgICAgIHNjcmFwZXJPcHRpb25zLFxuICAgICAgKSxcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGFjY291bnRzO1xufVxuXG5cbmNsYXNzIFZpc2FDYWxTY3JhcGVyIGV4dGVuZHMgQmFzZVNjcmFwZXJXaXRoQnJvd3NlciB7XG4gIG9wZW5Mb2dpblBvcHVwID0gYXN5bmMgKCkgPT4ge1xuICAgIGRlYnVnKCdvcGVuIGxvZ2luIHBvcHVwLCB3YWl0IHVudGlsIGxvZ2luIGJ1dHRvbiBhdmFpbGFibGUnKTtcbiAgICBhd2FpdCB3YWl0VW50aWxFbGVtZW50Rm91bmQodGhpcy5wYWdlLCAnI2NjTG9naW5EZXNrdG9wQnRuJywgdHJ1ZSk7XG4gICAgZGVidWcoJ2NsaWNrIG9uIHRoZSBsb2dpbiBidXR0b24nKTtcbiAgICBhd2FpdCBjbGlja0J1dHRvbih0aGlzLnBhZ2UsICcjY2NMb2dpbkRlc2t0b3BCdG4nKTtcbiAgICBkZWJ1ZygnZ2V0IHRoZSBmcmFtZSB0aGF0IGhvbGRzIHRoZSBsb2dpbicpO1xuICAgIGNvbnN0IGZyYW1lID0gYXdhaXQgZ2V0TG9naW5GcmFtZSh0aGlzLnBhZ2UpO1xuICAgIGRlYnVnKCd3YWl0IHVudGlsIHRoZSBwYXNzd29yZCBsb2dpbiB0YWIgaGVhZGVyIGlzIGF2YWlsYWJsZScpO1xuICAgIGF3YWl0IHdhaXRVbnRpbEVsZW1lbnRGb3VuZChmcmFtZSwgJyNyZWd1bGFyLWxvZ2luJyk7XG4gICAgZGVidWcoJ25hdmlnYXRlIHRvIHRoZSBwYXNzd29yZCBsb2dpbiB0YWInKTtcbiAgICBhd2FpdCBjbGlja0J1dHRvbihmcmFtZSwgJyNyZWd1bGFyLWxvZ2luJyk7XG4gICAgZGVidWcoJ3dhaXQgdW50aWwgdGhlIHBhc3N3b3JkIGxvZ2luIHRhYiBpcyBhY3RpdmUnKTtcbiAgICBhd2FpdCB3YWl0VW50aWxFbGVtZW50Rm91bmQoZnJhbWUsICdyZWd1bGFyLWxvZ2luJyk7XG5cbiAgICByZXR1cm4gZnJhbWU7XG4gIH07XG5cbiAgZ2V0TG9naW5PcHRpb25zKGNyZWRlbnRpYWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxvZ2luVXJsOiBgJHtMT0dJTl9VUkx9YCxcbiAgICAgIGZpZWxkczogY3JlYXRlTG9naW5GaWVsZHMoY3JlZGVudGlhbHMpLFxuICAgICAgc3VibWl0QnV0dG9uU2VsZWN0b3I6ICdidXR0b25bdHlwZT1cInN1Ym1pdFwiXScsXG4gICAgICBwb3NzaWJsZVJlc3VsdHM6IGdldFBvc3NpYmxlTG9naW5SZXN1bHRzKCksXG4gICAgICBjaGVja1JlYWRpbmVzczogYXN5bmMgKCkgPT4gd2FpdFVudGlsRWxlbWVudEZvdW5kKHRoaXMucGFnZSwgJyNjY0xvZ2luRGVza3RvcEJ0bicpLFxuICAgICAgcHJlQWN0aW9uOiB0aGlzLm9wZW5Mb2dpblBvcHVwLFxuICAgICAgdXNlckFnZW50OiAnTW96aWxsYS81LjAgKFgxMTsgTGludXggeDg2XzY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvNzguMC4zOTA0LjEwOCBTYWZhcmkvNTM3LjM2JyxcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgZmV0Y2hEYXRhKCk6IFByb21pc2U8U2NhcGVyU2NyYXBpbmdSZXN1bHQ+IHtcbiAgICBjb25zdCBkZWZhdWx0U3RhcnRNb21lbnQgPSBtb21lbnQoKS5zdWJ0cmFjdCgxLCAneWVhcnMnKS5hZGQoMSwgJ2RheScpO1xuICAgIGNvbnN0IHN0YXJ0RGF0ZSA9IHRoaXMub3B0aW9ucy5zdGFydERhdGUgfHwgZGVmYXVsdFN0YXJ0TW9tZW50LnRvRGF0ZSgpO1xuICAgIGNvbnN0IHN0YXJ0TW9tZW50ID0gbW9tZW50Lm1heChkZWZhdWx0U3RhcnRNb21lbnQsIG1vbWVudChzdGFydERhdGUpKTtcbiAgICBkZWJ1ZyhgZmV0Y2ggdHJhbnNhY3Rpb25zIHN0YXJ0aW5nICR7c3RhcnRNb21lbnQuZm9ybWF0KCl9YCk7XG5cbiAgICBkZWJ1ZygnbmF2aWdhdGUgdG8gdHJhbnNhY3Rpb25zIHBhZ2UnKTtcbiAgICBhd2FpdCB0aGlzLm5hdmlnYXRlVG8oVFJBTlNBQ1RJT05TX1VSTCwgdW5kZWZpbmVkLCA2MDAwMCk7XG5cbiAgICBkZWJ1ZygnZmV0Y2ggYWNjb3VudHMgdHJhbnNhY3Rpb25zJyk7XG4gICAgY29uc3QgYWNjb3VudHMgPSBhd2FpdCBmZXRjaFRyYW5zYWN0aW9ucyh0aGlzLnBhZ2UsIHN0YXJ0TW9tZW50LCB0aGlzLm9wdGlvbnMpO1xuICAgIGRlYnVnKCdyZXR1cm4gdGhlIHNjcmFwZWQgYWNjb3VudHMnKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIGFjY291bnRzLFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVmlzYUNhbFNjcmFwZXI7XG4iXX0=