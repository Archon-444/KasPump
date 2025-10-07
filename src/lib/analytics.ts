// Analytics tracking system for KasPump - crucial for partnerships and business intelligence
// Collects user interaction data, trading metrics, and platform usage statistics

interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
}

interface TokenAnalytics {
  tokenAddress: string;
  creator: string;
  createdAt: number;
  initialVolume: number;
  currentVolume: number;
  holders: number;
  transactions: number;
  graduationProgress: number;
  isGraduated: boolean;
}

interface UserAnalytics {
  userAddress: string;
  tokensCreated: number;
  tokensTraded: number;
  totalVolume: number;
  firstSeen: number;
  lastActive: number;
  successfulGraduations: number;
}

class KasPumpAnalytics {
  private sessionId: string;
  private events: AnalyticsEvent[] = [];
  private userId?: string;
  private flushTimer?: number;

  private static readonly FLUSH_THRESHOLD = 20;
  private static readonly MAX_QUEUE_SIZE = 200;
  private static readonly FLUSH_INTERVAL_MS = 15_000;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracking() {
    // Track page views and user engagement
    if (typeof window !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          this.flushEvents({ useBeacon: true });
        }
      };

      window.addEventListener('beforeunload', () => {
        this.flushEvents({ useBeacon: true });
      });
      document.addEventListener('visibilitychange', handleVisibilityChange);

      this.flushTimer = window.setInterval(() => {
        this.flushEvents();
      }, KasPumpAnalytics.FLUSH_INTERVAL_MS);
    }
  }

  // Set user ID when wallet connects
  setUserId(walletAddress: string) {
    this.userId = walletAddress;
    this.track('user_identified', {
      walletAddress,
      timestamp: Date.now()
    });
  }

  // Core tracking method
  track(eventName: string, properties: Record<string, any> = {}) {
    const event: AnalyticsEvent = {
      event: eventName,
      properties: {
        ...properties,
        platform: 'kaspump',
        version: '1.0.0',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      },
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId
    };

    this.events.push(event);

    if (this.events.length > KasPumpAnalytics.MAX_QUEUE_SIZE) {
      this.events.splice(0, this.events.length - KasPumpAnalytics.MAX_QUEUE_SIZE);
    }

    // Auto-flush events periodically or when buffer is full
    if (this.events.length >= KasPumpAnalytics.FLUSH_THRESHOLD) {
      this.flushEvents();
    }

    // Also send critical events immediately
    const criticalEvents = ['token_created', 'token_graduated', 'trade_completed', 'error_occurred'];
    if (criticalEvents.includes(eventName)) {
      this.sendEvent(event);
    }
  }

  // Token lifecycle tracking
  trackTokenCreation(tokenData: {
    tokenAddress: string;
    name: string;
    symbol: string;
    totalSupply: number;
    basePrice: number;
    curveType: string;
    creator: string;
  }) {
    this.track('token_created', {
      ...tokenData,
      category: 'token_lifecycle'
    });
  }

  trackTokenTrade(tradeData: {
    tokenAddress: string;
    action: 'buy' | 'sell';
    amount: number;
    price: number;
    totalValue: number;
    slippageTolerance: number;
    trader: string;
  }) {
    this.track('token_trade', {
      ...tradeData,
      category: 'trading'
    });
  }

  trackTokenGraduation(graduationData: {
    tokenAddress: string;
    finalSupply: number;
    totalVolume: number;
    timeToGraduation: number;
    finalMarketCap: number;
    creator: string;
  }) {
    this.track('token_graduated', {
      ...graduationData,
      category: 'token_lifecycle'
    });
  }

  // User interaction tracking
  trackPageView(page: string, properties: Record<string, any> = {}) {
    this.track('page_view', {
      page,
      ...properties,
      category: 'navigation'
    });
  }

  trackWalletConnection(walletType: string, address: string) {
    this.track('wallet_connected', {
      walletType,
      address,
      category: 'user_action'
    });
  }

  trackError(error: Error, context: Record<string, any> = {}) {
    this.track('error_occurred', {
      errorMessage: error.message,
      errorStack: error.stack,
      ...context,
      category: 'error'
    });
  }

  // Partnership and integration tracking
  trackApiUsage(endpoint: string, method: string, responseTime: number, statusCode: number) {
    this.track('api_request', {
      endpoint,
      method,
      responseTime,
      statusCode,
      category: 'api'
    });
  }

  trackPartnershipAction(partner: string, action: string, data: Record<string, any> = {}) {
    this.track('partnership_action', {
      partner,
      action,
      ...data,
      category: 'partnership'
    });
  }

  // Revenue tracking (crucial for business intelligence)
  trackRevenue(revenueData: {
    source: 'launch_fee' | 'premium_feature' | 'api_subscription' | 'partnership';
    amount: number;
    currency: 'KAS' | 'USD';
    tokenAddress?: string;
    userId?: string;
  }) {
    this.track('revenue_generated', {
      ...revenueData,
      category: 'revenue'
    });
  }

  // Premium feature usage tracking
  trackPremiumFeature(feature: string, tier: 'basic' | 'premium' | 'enterprise', usage: Record<string, any>) {
    this.track('premium_feature_used', {
      feature,
      tier,
      ...usage,
      category: 'premium'
    });
  }

  // Flush events to analytics service
  private async flushEvents(options: { useBeacon?: boolean } = {}) {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      if (options.useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const payload = JSON.stringify({ events: eventsToSend });
        const blob = new Blob([payload], { type: 'application/json' });
        const ok = navigator.sendBeacon('/api/analytics/events', blob);
        if (!ok) {
          throw new Error('sendBeacon rejected payload');
        }
        return;
      }

      await this.sendEvents(eventsToSend);
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-queue events for retry
      this.events.unshift(...eventsToSend);
    }
  }

  private async sendEvent(event: AnalyticsEvent) {
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  private async sendEvents(events: AnalyticsEvent[]) {
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events })
      });
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      throw error;
    }
  }

  // Get analytics summary for dashboard
  async getAnalyticsSummary(timeframe: '24h' | '7d' | '30d' | 'all' = '24h') {
    try {
      const response = await fetch(`/api/analytics?timeframe=${timeframe}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch analytics summary:', error);
      throw error;
    }
  }

  // Get token-specific analytics
  async getTokenAnalytics(tokenAddress: string): Promise<TokenAnalytics | null> {
    try {
      const response = await fetch(`/api/tokens?address=${tokenAddress}`);
      const data = await response.json();
      
      return {
        tokenAddress: data.address,
        creator: data.creator,
        createdAt: new Date(data.createdAt).getTime(),
        initialVolume: 0, // Would track from creation
        currentVolume: data.volume24h,
        holders: data.analytics.holders,
        transactions: data.analytics.transactions24h,
        graduationProgress: data.graduationProgress,
        isGraduated: data.isGraduated
      };
    } catch (error) {
      console.error('Failed to fetch token analytics:', error);
      return null;
    }
  }

  // Partnership-specific methods
  async getPartnershipMetrics(partner?: string) {
    const events = this.events.filter(e => 
      e.event === 'partnership_action' && 
      (!partner || e.properties.partner === partner)
    );

    return {
      totalEvents: events.length,
      uniqueUsers: new Set(events.map(e => e.userId)).size,
      eventTypes: events.reduce((acc, e) => {
        acc[e.properties.action] = (acc[e.properties.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

// Global analytics instance
export const analytics = new KasPumpAnalytics();

// React hook for analytics
export function useAnalytics() {
  const trackEvent = (eventName: string, properties: Record<string, any> = {}) => {
    analytics.track(eventName, properties);
  };

  const trackPageView = (page: string, properties: Record<string, any> = {}) => {
    analytics.trackPageView(page, properties);
  };

  const trackError = (error: Error, context: Record<string, any> = {}) => {
    analytics.trackError(error, context);
  };

  const setUserId = (address: string) => {
    analytics.setUserId(address);
  };

  return {
    trackEvent,
    trackPageView,
    trackError,
    setUserId,
    analytics
  };
}

// Higher-order component for automatic page tracking
export function withAnalytics<P extends object>(Component: React.ComponentType<P>, pageName: string) {
  return function AnalyticsWrapper(props: P) {
    React.useEffect(() => {
      analytics.trackPageView(pageName);
    }, []);

    return <Component {...props} />;
  };
}

export default analytics;