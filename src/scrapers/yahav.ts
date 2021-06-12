import _ from 'lodash';
import moment, { Moment } from 'moment';
import { Page } from 'puppeteer';
import { SHEKEL_CURRENCY } from '../constants';
import {
  clickButton, elementPresentOnPage,
  pageEvalAll, waitUntilElementDisappear, waitUntilElementFound,
} from '../helpers/elements-interactions';
import { waitForNavigation } from '../helpers/navigation';
import {
  Transaction, TransactionsAccount,
  TransactionStatuses, TransactionTypes,
} from '../transactions';
import { ScraperCredentials } from './base-scraper';
import {
  BaseScraperWithBrowser,
  LoginResults,
  PossibleLoginResults,
} from './base-scraper-with-browser';

const LOGIN_URL = 'https://login.yahav.co.il/login/';
const BASE_URL = 'https://digital.yahav.co.il/BaNCSDigitalUI/app/index.html#/';
const INVALID_DETAILS_SELECTOR = '.ui-dialog-buttons';
const CHANGE_PASSWORD_OLD_PASS = 'input#ef_req_parameter_old_passwd';
const BASE_WELCOME_URL = `${BASE_URL}main/home`;

const ACCOUNT_ID_SELECTOR = '.dropdown-dir .selected-item-top';
const ACCOUNT_DETAILS_SELECTOR = '.account-details';
const DATE_FORMAT = 'DD/MM/YYYY';

const USER_ELEM = '#USER';
const PASSWD_ELEM = '#PASSWORD';
const NATIONALID_ELEM = '#NATIONAL_ID';

interface ScrapedTransaction {
  credit: string;
  debit: string;
  date: string;
  reference?: string;
  description: string;
  memo: string;
  status: TransactionStatuses;
}

function getPossibleLoginResults(page: Page): PossibleLoginResults {
  // checkout file `base-scraper-with-browser.ts` for available result types
  const urls: PossibleLoginResults = {};
  urls[LoginResults.Success] = [
    `${BASE_WELCOME_URL}`,
  ];
  urls[LoginResults.InvalidPassword] = [async () => {
    return elementPresentOnPage(page, `${INVALID_DETAILS_SELECTOR}`);
  }];

  urls[LoginResults.ChangePassword] = [async () => {
    return elementPresentOnPage(page, `${CHANGE_PASSWORD_OLD_PASS}`);
  }];

  return urls;
}

async function getAccountID(page: Page) {
  const selectedSnifAccount = await page.$eval(`${ACCOUNT_ID_SELECTOR}`, (option) => {
    return (option as HTMLElement).innerText;
  });

  return selectedSnifAccount;
}

function getAmountData(amountStr: string) {
  const amountStrCopy = amountStr.replace(',', '');
  return parseFloat(amountStrCopy);
}

function getTxnAmount(txn: ScrapedTransaction) {
  const credit = getAmountData(txn.credit);
  const debit = getAmountData(txn.debit);
  return (Number.isNaN(credit) ? 0 : credit) - (Number.isNaN(debit) ? 0 : debit);
}

type TransactionsTr = { id: string, innerDivs: string[] };

function convertTransactions(txns: ScrapedTransaction[]): Transaction[] {
  return txns.map((txn) => {
    const convertedDate = moment(txn.date, DATE_FORMAT).toISOString();
    const convertedAmount = getTxnAmount(txn);
    return {
      type: TransactionTypes.Normal,
      identifier: txn.reference ? parseInt(txn.reference, 10) : undefined,
      date: convertedDate,
      processedDate: convertedDate,
      originalAmount: convertedAmount,
      originalCurrency: SHEKEL_CURRENCY,
      chargedAmount: convertedAmount,
      status: txn.status,
      description: txn.description,
      memo: txn.memo,
    };
  });
}

function handleTransactionRow(txns: ScrapedTransaction[], txnRow: TransactionsTr) {
  const div = txnRow.innerDivs;

  // Remove anything except digits.
  const regex = /\D+/gm;

  const tx: ScrapedTransaction = {
    date: div[1],
    reference: div[2].replace(regex, ''),
    memo: '',
    description: div[3],
    debit: div[4],
    credit: div[5],
    status: TransactionStatuses.Completed,
  };

  txns.push(tx);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccountTransactions(page: Page): Promise<Transaction[]> {
  // Wait for transactions.
  await waitUntilElementFound(page, '.under-line-txn-table-header', true);

  const txns: ScrapedTransaction[] = [];
  const transactionsDivs = await pageEvalAll<TransactionsTr[]>(page, '.list-item-holder .entire-content-ctr', [], (divs) => {
    return (divs as HTMLElement[]).map((div) => ({
      id: (div).getAttribute('id') || '',
      innerDivs: Array.from(div.getElementsByTagName('div')).map((div) => (div as HTMLElement).innerText),
    }));
  });

  for (const txnRow of transactionsDivs) {
    handleTransactionRow(txns, txnRow);
  }

  return convertTransactions(txns);
}

async function searchByDates(page: Page/* , startDate: Moment */) {
  // TODO: Find a way to select the dates programatically.

  // Click on drop-down
  await clickButton(page, '.statement-options .selected-item-top');

  // Wait for drop-down creation
  await sleep(1000);

  let ddvalue = '';
  let item = 1;
  do {
    ddvalue = await page.$eval(`div.drop-down-item:nth-child(${item}) > div:nth-child(1) > span`, (option) => {
      return (option as HTMLElement).innerText;
    });

    if (ddvalue === '3 חודשים אחרונים') {
      break;
    }
    item += 1;
  }
  while (!_.isEmpty(ddvalue));


  // Click the 3 months transactions option
  await clickButton(page, `div.drop-down-item:nth-child(${item}) > div:nth-child(1) > span`);
}

function filterTXByDate(txns: Transaction[], startDate: Moment): Transaction[] {
  const txs = _.filter(txns, (tx) => {
    return startDate.isSameOrBefore(tx.date, 'day');
  });

  return txs;
}

async function fetchAccountData(page: Page, startDate: Moment, accountID: string): Promise<TransactionsAccount> {
  await searchByDates(page/* , startDate */);
  await waitUntilElementDisappear(page, '.loading-bar-spinner');
  const accountTxs = await getAccountTransactions(page);
  const txns = filterTXByDate(accountTxs, startDate);

  return {
    accountNumber: accountID,
    txns,
  };
}

async function fetchAccounts(page: Page, startDate: Moment): Promise<TransactionsAccount[]> {
  const accounts: TransactionsAccount[] = [];

  // TODO: get more accounts
  const accountID = await getAccountID(page);
  const accountData = await fetchAccountData(page, startDate, accountID);
  accounts.push(accountData);

  return accounts;
}

async function waitReadinessForAll(page: Page) {
  await waitUntilElementFound(page, `${USER_ELEM}`, true);
  await waitUntilElementFound(page, `${PASSWD_ELEM}`, true);
  await waitUntilElementFound(page, `${NATIONALID_ELEM}`, true);
}

async function redirectOrDialog(page: Page) {
  // Click on messages
  await waitForNavigation(page);
  await waitUntilElementDisappear(page, '.loading-bar-spinner');
  const hasMessage = await elementPresentOnPage(page, '.messaging-links-container');
  if (hasMessage) {
    await clickButton(page, '.link-1');
  }

  const promise1 = page.waitForSelector(ACCOUNT_DETAILS_SELECTOR, { timeout: 30000 });
  const promise2 = page.waitForSelector(CHANGE_PASSWORD_OLD_PASS, { timeout: 30000 });
  const promises = [promise1, promise2];

  await Promise.race(promises);
  await waitUntilElementDisappear(page, '.loading-bar-spinner');
}

class YahavScraper extends BaseScraperWithBrowser {
  getLoginOptions(credentials: ScraperCredentials) {
    return {
      loginUrl: `${LOGIN_URL}`,
      fields: [
        { selector: `${USER_ELEM}`, value: credentials.username },
        { selector: `${PASSWD_ELEM}`, value: credentials.password },
        { selector: `${NATIONALID_ELEM}`, value: credentials.nationalID },
      ],
      submitButtonSelector: '.submit',
      checkReadiness: async () => waitReadinessForAll(this.page),
      postAction: async () => redirectOrDialog(this.page),
      possibleResults: getPossibleLoginResults(this.page),
    };
  }

  async fetchData() {
    // Goto statements page
    await waitUntilElementFound(this.page, ACCOUNT_DETAILS_SELECTOR, true);
    await clickButton(this.page, ACCOUNT_DETAILS_SELECTOR);
    await waitUntilElementFound(this.page, '.statement-options .selected-item-top', true);

    const defaultStartMoment = moment().subtract(3, 'months').add(1, 'day');
    const startDate = this.options.startDate || defaultStartMoment.toDate();
    const startMoment = moment.max(defaultStartMoment, moment(startDate));

    const accounts = await fetchAccounts(this.page, startMoment);

    return {
      success: true,
      accounts,
    };
  }
}

export default YahavScraper;
