export type SitemapChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export interface SitemapPage {
  path: string;
  priority: number;
  changeFrequency: SitemapChangeFrequency;
}
