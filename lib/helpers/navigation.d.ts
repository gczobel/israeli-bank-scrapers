import { NavigationOptions, Page } from 'puppeteer';
export declare function waitForNavigation(page: Page, options?: NavigationOptions): Promise<void>;
export declare function waitForNavigationAndDomLoad(page: Page): Promise<void>;
export declare function getCurrentUrl(page: Page, clientSide?: boolean): Promise<string>;
export declare function waitForRedirect(page: Page, timeout?: number, clientSide?: boolean, ignoreList?: string[]): Promise<void>;
