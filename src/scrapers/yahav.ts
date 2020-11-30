import moment, { Moment } from 'moment';
import { Page } from 'puppeteer';
import { SHEKEL_CURRENCY } from '../constants';
import {
  clickButton, elementPresentOnPage,
  pageEvalAll, waitUntilElementFound,
} from '../helpers/elements-interactions';
import { waitForRedirect } from '../helpers/navigation';
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
const BASE_URL = 'https://digital.yahav.co.il/BaNCSDigitalUI/app/index.html#!/';
const INVALID_DETAILS_SELECTOR = '.ui-dialog-buttons';
const BASE_WELCOME_URL = `${BASE_URL}main/home`;
// const REDIRECT = /https:\/\/digital\.yahav\.co.il\/BaNCSDigitalUI\/app\/index\.html#!\/authentication(.|\n)*/;
const REDIRECT = 'https://digital.yahav.co.il/BaNCSDigitalUI/app/index.html#!/authentication';
// const CURRENT_URL = `${BASE_URL}main/accounts/current`;
const DATE_FORMAT = 'DD/MM/YY';

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

async function getAccountTransactions(page: Page): Promise<Transaction[]> {
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

async function searchByDates(page: Page, startDate: Moment) {
  // await dropdownSelect(page, 'select#ddlTransactionPeriod', '004');
  // await waitUntilElementFound(page, 'select#ddlTransactionPeriod');
  // await fillInput(
  //   page,
  //   'input#dtFromDate_textBox',
  //   startDate.format(DATE_FORMAT),
  // );
  // await clickButton(page, 'input#btnDisplayDates');
  // await waitForNavigation(page);

  console.log(startDate);
  await clickButton(page, '.statement-options .selected-item-top');
  await waitUntilElementFound(page, '.selected-item.enabled.color-chng');
  // Click the 3 months transactions option
  await clickButton(page, 'div.drop-down-item:nth-child(1) > div:nth-child(1) > span');
}

async function fetchAccountData(page: Page, startDate: Moment, accountID: string): Promise<TransactionsAccount> {
  await searchByDates(page, startDate);
  const txns = await getAccountTransactions(page);
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
  await waitUntilElementFound(page, `${USER_ELEM}`, true, 60000);
  await waitUntilElementFound(page, `${PASSWD_ELEM}`, true, 60000);
  await waitUntilElementFound(page, `${NATIONALID_ELEM}`, true, 60000);
}

async function redirectOrDialog(page: Page) {
  await waitForRedirect(page, 20000, false, [`${REDIRECT}`]);
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
    await clickButton(this.page, '.account-details');
    await waitUntilElementFound(this.page, '.statement-options .selected-item-top', true, 60000);

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
