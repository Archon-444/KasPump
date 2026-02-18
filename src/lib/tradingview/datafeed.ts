/**
 * TradingView Datafeed Implementation
 * Implements the UDF (Universal Data Feed) protocol for TradingView charts
 */

import {
  IBasicDataFeed,
  LibrarySymbolInfo,
  ResolutionString,
  Bar,
  HistoryCallback,
  SubscribeBarsCallback,
  OnReadyCallback,
  SearchSymbolsCallback,
  ResolveCallback,
  ErrorCallback,
} from '../../types/charting_library';

interface KasPumpSymbol {
  symbol: string;
  full_name: string;
  description: string;
  exchange: string;
  type: string;
}

export class KasPumpDatafeed implements IBasicDataFeed {
  private apiUrl: string;
  private subscribers: Map<string, SubscribeBarsCallback> = new Map();
  private lastBars: Map<string, Bar> = new Map();

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  }

  /**
   * This method is used by the charting library to get a configuration of the datafeed.
   */
  onReady(callback: OnReadyCallback): void {
    setTimeout(() => {
      callback({
        supported_resolutions: [
          '1' as ResolutionString,
          '5' as ResolutionString,
          '15' as ResolutionString,
          '30' as ResolutionString,
          '60' as ResolutionString,
          '240' as ResolutionString,
          '1D' as ResolutionString,
        ],
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: true,
      });
    }, 0);
  }

  /**
   * This method is used by the library to search symbols by user input.
   */
  searchSymbols(
    userInput: string,
    _exchange: string,
    _symbolType: string,
    onResult: SearchSymbolsCallback
  ): void {
    fetch(`${this.apiUrl}/api/trading/market/bscTestnet/tokens?search=${encodeURIComponent(userInput)}`)
      .then((response) => response.json())
      .then((data) => {
        const symbols: KasPumpSymbol[] = data.data.tokens.map((token: any) => ({
          symbol: token.symbol,
          full_name: `${token.symbol}/BNB`,
          description: token.name,
          exchange: 'KasPump',
          type: 'crypto',
        }));
        onResult(symbols);
      })
      .catch((error) => {
        console.error('Error searching symbols:', error);
        onResult([]);
      });
  }

  /**
   * This method is used by the library to retrieve information about a specific symbol.
   */
  resolveSymbol(
    symbolName: string,
    onResolve: ResolveCallback,
    onError: ErrorCallback
  ): void {
    // Parse symbol (format: TOKEN/BNB)
    const [token, _quote] = symbolName.split('/');

    fetch(`${this.apiUrl}/api/trading/token/bscTestnet/${token}/info`)
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) {
          onError('Symbol not found');
          return;
        }

        const symbolInfo: LibrarySymbolInfo = {
          name: symbolName,
          full_name: `KasPump:${symbolName}`,
          description: data.data.name || token,
          type: 'crypto',
          session: '24x7',
          exchange: 'KasPump',
          listed_exchange: 'KasPump',
          timezone: 'Etc/UTC',
          format: 'price',
          pricescale: 1000000000000000000, // 18 decimals
          minmov: 1,
          has_intraday: true,
          has_daily: true,
          has_weekly_and_monthly: false,
          supported_resolutions: [
            '1' as ResolutionString,
            '5' as ResolutionString,
            '15' as ResolutionString,
            '30' as ResolutionString,
            '60' as ResolutionString,
            '240' as ResolutionString,
            '1D' as ResolutionString,
          ],
          volume_precision: 2,
          data_status: 'streaming',
        };

        onResolve(symbolInfo);
      })
      .catch((error) => {
        console.error('Error resolving symbol:', error);
        onError('Error resolving symbol');
      });
  }

  /**
   * This method is used by the library to get historical bars for a specific symbol.
   */
  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: {
      from: number;
      to: number;
      firstDataRequest: boolean;
      countBack?: number;
    },
    onResult: HistoryCallback,
    onError: ErrorCallback
  ): void {
    const [token] = symbolInfo.name.split('/');

    fetch(
      `${this.apiUrl}/api/trading/token/bscTestnet/${token}/chart?` +
        `from=${periodParams.from}&to=${periodParams.to}&resolution=${resolution}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (!data.success || !data.data.bars || data.data.bars.length === 0) {
          onResult([], { noData: true });
          return;
        }

        const bars: Bar[] = data.data.bars.map((bar: any) => ({
          time: bar.time * 1000, // Convert to milliseconds
          open: parseFloat(bar.open),
          high: parseFloat(bar.high),
          low: parseFloat(bar.low),
          close: parseFloat(bar.close),
          volume: parseFloat(bar.volume),
        }));

        // Save last bar for subscription updates
        if (bars.length > 0) {
          this.lastBars.set(symbolInfo.name, bars[bars.length - 1]!);
        }

        onResult(bars, { noData: false });
      })
      .catch((error) => {
        console.error('Error getting bars:', error);
        onError('Error loading chart data');
      });
  }

  /**
   * This method is used by the library to subscribe to real-time updates for a specific symbol.
   */
  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: SubscribeBarsCallback,
    listenerGuid: string,
    _onResetCacheNeededCallback: () => void
  ): void {
    this.subscribers.set(listenerGuid, onTick);

    // In a real implementation, you would subscribe to WebSocket updates here
    // For now, we'll use polling as a fallback
    const [token] = symbolInfo.name.split('/');

    const pollInterval = setInterval(() => {
      fetch(`${this.apiUrl}/api/trading/token/bscTestnet/${token}/price`)
        .then((response) => response.json())
        .then((data) => {
          if (!data.success) return;

          const lastBar = this.lastBars.get(symbolInfo.name);
          const price = parseFloat(data.data.price);
          const time = data.data.timestamp * 1000;

          if (!lastBar) {
            // Create initial bar
            const newBar: Bar = {
              time,
              open: price,
              high: price,
              low: price,
              close: price,
              volume: 0,
            };
            this.lastBars.set(symbolInfo.name, newBar);
            onTick(newBar);
            return;
          }

          // Check if we need a new bar based on resolution
          const resolutionMs = this.getResolutionMs(resolution);
          const shouldCreateNewBar = time - lastBar.time >= resolutionMs;

          if (shouldCreateNewBar) {
            // Create new bar
            const newBar: Bar = {
              time: lastBar.time + resolutionMs,
              open: price,
              high: price,
              low: price,
              close: price,
              volume: 0,
            };
            this.lastBars.set(symbolInfo.name, newBar);
            onTick(newBar);
          } else {
            // Update current bar
            const updatedBar: Bar = {
              ...lastBar,
              high: Math.max(lastBar.high, price),
              low: Math.min(lastBar.low, price),
              close: price,
            };
            this.lastBars.set(symbolInfo.name, updatedBar);
            onTick(updatedBar);
          }
        })
        .catch((error) => {
          console.error('Error polling price:', error);
        });
    }, 5000); // Poll every 5 seconds

    // Store interval for cleanup
    (this.subscribers as any)[`${listenerGuid}_interval`] = pollInterval;
  }

  /**
   * This method is used by the library to unsubscribe from real-time updates.
   */
  unsubscribeBars(listenerGuid: string): void {
    this.subscribers.delete(listenerGuid);

    // Clear polling interval
    const interval = (this.subscribers as any)[`${listenerGuid}_interval`];
    if (interval) {
      clearInterval(interval);
      delete (this.subscribers as any)[`${listenerGuid}_interval`];
    }
  }

  /**
   * Convert resolution to milliseconds
   */
  private getResolutionMs(resolution: ResolutionString): number {
    const resolutionMap: { [key: string]: number } = {
      '1': 60 * 1000, // 1 minute
      '5': 5 * 60 * 1000,
      '15': 15 * 60 * 1000,
      '30': 30 * 60 * 1000,
      '60': 60 * 60 * 1000,
      '240': 4 * 60 * 60 * 1000,
      '1D': 24 * 60 * 60 * 1000,
    };

    return resolutionMap[resolution] || 60 * 1000;
  }
}
