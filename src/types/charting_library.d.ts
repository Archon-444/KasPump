// Type stub declarations for TradingView Charting Library (loaded at runtime)
export interface IBasicDataFeed {}
export interface LibrarySymbolInfo {
  name: string;
  full_name: string;
  description: string;
  type: string;
  session: string;
  exchange: string;
  listed_exchange: string;
  timezone: string;
  format: string;
  pricescale: number;
  minmov: number;
  has_intraday: boolean;
  has_daily: boolean;
  has_weekly_and_monthly: boolean;
  supported_resolutions: string[];
  volume_precision: number;
  data_status: string;
  [key: string]: unknown;
}
export type ResolutionString = string;
export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | undefined;
}
export type HistoryCallback = (bars: Bar[], meta: { noData?: boolean | undefined }) => void;
export type SubscribeBarsCallback = (bar: Bar) => void;
export type OnReadyCallback = (config: Record<string, unknown>) => void;
export type SearchSymbolsCallback = (symbols: unknown[]) => void;
export type ResolveCallback = (symbolInfo: LibrarySymbolInfo) => void;
export type ErrorCallback = (error: string) => void;
