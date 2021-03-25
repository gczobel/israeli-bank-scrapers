import { Page } from 'puppeteer';
declare function waitUntilElementFound(page: Page, elementSelector: string, onlyVisible?: boolean, timeout?: number): Promise<void>;
declare function waitUntilElementDisappear(page: Page, elementSelector: string, timeout?: number): Promise<void>;
declare function fillInput(page: Page, inputSelector: string, inputValue: string): Promise<void>;
declare function clickButton(page: Page, buttonSelector: string): Promise<void>;
declare function clickLink(page: Page, aSelector: string): Promise<void>;
declare function pageEvalAll<R>(page: Page, selector: string, defaultResult: any, callback: (elements: Element[]) => R): Promise<R>;
declare function elementPresentOnPage(page: Page, selector: string): Promise<boolean>;
declare function dropdownSelect(page: Page, selectSelector: string, value: string): Promise<void>;
declare function dropdownElements(page: Page, selector: string): Promise<{
    name: any;
    value: any;
}[]>;
export { waitUntilElementFound, waitUntilElementDisappear, fillInput, clickButton, clickLink, dropdownSelect, dropdownElements, pageEvalAll, elementPresentOnPage, };
