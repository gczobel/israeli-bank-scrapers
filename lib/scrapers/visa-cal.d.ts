import { ScraperErrorTypes, BaseScraper, ScraperCredentials } from './base-scraper';
import { TransactionsAccount } from '../transactions';
declare class VisaCalScraper extends BaseScraper {
    private authHeader;
    login(credentials: ScraperCredentials): Promise<{
        success: boolean;
        errorType: ScraperErrorTypes;
        errorMessage?: undefined;
    } | {
        success: boolean;
        errorType: ScraperErrorTypes;
        errorMessage: string;
    } | {
        success: boolean;
        errorType?: undefined;
        errorMessage?: undefined;
    }>;
    fetchData(): Promise<{
        success: boolean;
        accounts: TransactionsAccount[];
    } | {
        success: boolean;
        accounts?: undefined;
    }>;
}
export default VisaCalScraper;
