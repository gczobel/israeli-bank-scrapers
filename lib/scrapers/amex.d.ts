import IsracardAmexBaseScraper from './base-isracard-amex';
import { ScaperOptions } from './base-scraper';
declare class AmexScraper extends IsracardAmexBaseScraper {
    constructor(options: ScaperOptions);
}
export default AmexScraper;
