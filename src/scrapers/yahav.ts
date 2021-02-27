import _ from 'lodash';
import moment, { Moment } from 'moment';
import { Page } from 'puppeteer';
import { SHEKEL_CURRENCY } from '../constants';
import {
  clickButton, elementPresentOnPage,
  pageEvalAll, waitUntilElementFound,
} from '../helpers/elements-interactions';
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
const BASE_WELCOME_URL = `${BASE_URL}main/home`;

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

  // TODO: add change password url/element
  urls[LoginResults.ChangePassword] = [];
  return urls;
}

async function getAccountID(page: Page) {
  const selectedSnifAccount = await page.$eval('.dropdown-dir .selected-item-top', (option) => {
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
    memo: div[3],
    description: '',
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
  await sleep(2000);
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

  // Click the 3 months transactions option
  await clickButton(page, 'div.drop-down-item:nth-child(1) > div:nth-child(1) > span');
}

function filterTXByDate(txns: Transaction[], startDate: Moment): Transaction[] {
  const txs = _.filter(txns, (tx) => {
    return startDate.isSameOrBefore(tx.date, 'day');
  });

  return txs;
}

async function fetchAccountData(page: Page, startDate: Moment, accountID: string): Promise<TransactionsAccount> {
  await searchByDates(page/* , startDate */);
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
  await waitUntilElementFound(page, '.account-details', true);
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
    await waitUntilElementFound(this.page, '.account-details', true);
    await clickButton(this.page, '.account-details');
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
