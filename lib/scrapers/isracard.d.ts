import IsracardAmexBaseScraper from './base-isracard-amex';
import { ScaperOptions } from './base-scraper';
declare class IsracardScraper extends IsracardAmexBaseScraper {
    constructor(options: ScaperOptions);
}
export default IsracardScraper;
