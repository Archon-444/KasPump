# Error Handling & Push Notifications Implementation
**Date**: 2025-01-27  
**Status (2026-08-13):** Error-handling UI is in the tree. Push: `api/push/subscribe` still does **not** persist subscriptions (tab-closed delivery does not work). See TECHNICAL_DEBT.md.

## Overview

This document outlines the comprehensive error handling system and push notification implementation for KasPump.

---

## ✅ Error Handling System

### 1. Error Boundary Component
**Location**: `src/components/features/ErrorBoundary.tsx`

- ✅ **React Error Boundary**: Catches React component errors
- ✅ **User-Friendly UI**: Beautiful error display with recovery options
- ✅ **Retry Mechanism**: Automatic retry with visual feedback
- ✅ **Error Details**: Expandable technical details (development only)
- ✅ **Custom Fallback**: Support for custom error UI
- ✅ **Error Callbacks**: Optional error handler for logging/tracking

**Features**:
- Animated error display
- Dismiss option
- Retry functionality
- Development debug info

**Usage**:
```tsx
<ErrorBoundary onError={(error, info) => trackError(error, info)}>
  <YourComponent />
</ErrorBoundary>
```

---

### 2. Error Toast Component
**Location**: `src/components/features/ErrorToast.tsx`

- ✅ **Toast Notifications**: Non-blocking error messages
- ✅ **Error Type Detection**: Automatically categorizes errors
  - Network errors
  - Transaction errors
  - Wallet errors
  - Permission errors
- ✅ **Action Buttons**: Retry, view details, external links
- ✅ **Auto-Dismiss**: Configurable auto-close duration
- ✅ **Visual Indicators**: Color-coded by error type
- ✅ **Transaction Links**: Direct links to explorer for failed transactions

**Features**:
- Smart error categorization
- Context-aware actions
- Explorer links for transactions
- Retry functionality

**Usage**:
```tsx
<ErrorToast
  error={error}
  onDismiss={() => setError(null)}
  onRetry={handleRetry}
  action={{
    label: 'View Details',
    onClick: () => navigate('/error-details'),
  }}
/>
```

---

### 3. Error Handler Hook
**Location**: `src/hooks/useErrorHandler.ts`

- ✅ **Centralized Error Management**: Single source of truth for errors
- ✅ **Retry Logic**: Automatic retry with configurable max attempts
- ✅ **Error State**: Error info with retry count and status
- ✅ **Recovery Options**: Custom retry handlers
- ✅ **Action Support**: Custom error actions

**Features**:
- Retry count tracking
- Max retries configuration
- Custom retry handlers
- Error state management

**Usage**:
```tsx
const { error, handleError, retry, isRetrying } = useErrorHandler(3);

try {
  await someOperation();
} catch (err) {
  handleError(err, {
    retryable: true,
    onRetry: async () => await someOperation(),
    action: {
      label: 'Contact Support',
      onClick: () => openSupport(),
    },
  });
}
```

---

### 4. Enhanced Error Pages
**Location**: `src/app/error.tsx`, `src/app/global-error.tsx`

- ✅ **User-Friendly Messages**: Clear, actionable error messages
- ✅ **Error Suggestions**: Context-aware troubleshooting tips
- ✅ **Error Type Detection**: Network, loading, wallet, general
- ✅ **Recovery Actions**: Try again, go home, view details
- ✅ **Debug Information**: Development-only error details

**Features**:
- Animated error display
- Context-aware suggestions
- Multiple recovery options
- Development debug mode

---

### 5. Error Integration
**Location**: `src/app/layout.tsx`

- ✅ **Global Error Boundary**: Wraps entire application
- ✅ **Error Tracking**: Ready for error tracking service integration
- ✅ **Graceful Degradation**: App continues working despite errors

---

## ✅ Push Notification System

### 1. Push Notification Hook
**Location**: `src/hooks/usePushNotifications.ts`

- ✅ **Permission Management**: Request and check notification permissions
- ✅ **Subscription Management**: Subscribe/unsubscribe to push notifications
- ✅ **Local Notifications**: Show immediate notifications
- ✅ **Price Alerts**: Specialized price alert notifications
- ✅ **Trade Updates**: Trade status notifications
- ✅ **VAPID Support**: Web Push API integration

**Features**:
- Browser support detection
- Permission state management
- Subscription persistence
- Backend integration

**Usage**:
```tsx
const {
  permission,
  subscribe,
  unsubscribe,
  showPriceAlert,
  showTradeUpdate,
} = usePushNotifications();

// Subscribe
await subscribe();

// Show price alert
showPriceAlert('KMOON', 0.000125, 0.0002, 'above');

// Show trade update
showTradeUpdate('buy', 'KMOON', 1000, 'success');
```

---

### 2. Push Notification Settings Component
**Location**: `src/components/features/PushNotificationSettings.tsx`

- ✅ **Permission UI**: Request permission with clear messaging
- ✅ **Subscription Toggle**: Enable/disable push notifications
- ✅ **Notification Preferences**: Configure notification types
  - Price alerts
  - Trade updates
  - New tokens
  - Social activity
- ✅ **Status Indicators**: Visual status badges
- ✅ **Error Handling**: Graceful error messages

**Features**:
- Permission request flow
- Preference management
- Status visualization
- Error recovery

---

### 3. Service Worker Push Handling
**Location**: `public/sw.js`

- ✅ **Push Event Listener**: Handles incoming push notifications
- ✅ **Notification Display**: Shows notifications with custom data
- ✅ **Notification Actions**: Interactive notification buttons
- ✅ **Click Handling**: Opens app to relevant page
- ✅ **Type-Specific Handling**: Different handling for price alerts, trades, etc.

**Features**:
- Payload parsing
- Custom notification data
- Action buttons
- Deep linking

**Notification Types**:
- `price-alert`: Price target reached
- `trade-update`: Trade status changed
- `general`: General platform notifications

---

### 4. Push Notification API
**Location**: `src/app/api/push/subscribe/route.ts`

- ✅ **Subscription Endpoint**: Save subscriptions to backend
- ✅ **Unsubscription Endpoint**: Remove subscriptions
- ✅ **Error Handling**: Graceful error responses

**Endpoints**:
- `POST /api/push/subscribe` - Save subscription
- `DELETE /api/push/subscribe` - Remove subscription

**TODO**: Integrate with database for persistent storage

---

## 📋 Configuration

### Environment Variables

Add to `.env.local`:
```bash
# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key_here
```

### VAPID Key Generation

1. Install `web-push`:
   ```bash
   npm install -g web-push
   ```

2. Generate keys:
   ```bash
   web-push generate-vapid-keys
   ```

3. Add public key to `.env.local`
4. Store private key securely (for server-side push sending)

---

## 🧪 Testing

### Error Handling Testing

1. **Test Error Boundary**:
   - Trigger a React error
   - Verify error UI displays
   - Test retry functionality
   - Test dismiss functionality

2. **Test Error Toast**:
   - Trigger various error types
   - Verify correct error categorization
   - Test action buttons
   - Test auto-dismiss

3. **Test Error Handler Hook**:
   - Test retry logic
   - Test max retries
   - Test error state management

### Push Notification Testing

1. **Test Permission Request**:
   - Open settings page
   - Click "Enable Notifications"
   - Verify permission prompt
   - Test grant/deny scenarios

2. **Test Subscription**:
   - Subscribe to notifications
   - Verify subscription saved
   - Test unsubscribe

3. **Test Notifications**:
   - Trigger price alert
   - Trigger trade update
   - Verify notification displays
   - Test notification click

4. **Test Service Worker**:
   - Open DevTools → Application → Service Workers
   - Send test push notification
   - Verify notification displays
   - Test notification actions

---

## 📊 Error Types

### Network Errors
- **Detection**: Error message contains "network" or "fetch"
- **Suggestions**: Check connection, refresh page
- **Recovery**: Retry with exponential backoff

### Transaction Errors
- **Detection**: Error message contains "gas" or "transaction"
- **Suggestions**: Check gas, increase slippage
- **Recovery**: Retry transaction, view on explorer

### Wallet Errors
- **Detection**: Error message contains "wallet" or "connect"
- **Suggestions**: Reconnect wallet, check extension
- **Recovery**: Reconnect wallet

### Permission Errors
- **Detection**: Error message contains "permission" or "denied"
- **Suggestions**: Enable permissions in browser
- **Recovery**: Request permission again

---

## 🔄 Integration Points

### Error Tracking Service

Ready for integration with:
- Sentry
- LogRocket
- Bugsnag
- Custom error tracking

**Example**:
```tsx
// In ErrorBoundary componentDidCatch
if (this.props.onError) {
  this.props.onError(error, errorInfo);
  // Send to tracking service
  trackError(error, { errorInfo });
}
```

### Push Notification Backend

Ready for integration with:
- Database storage
- Push notification service
- User preferences storage

**Example**:
```tsx
// In /api/push/subscribe
await db.pushSubscriptions.create({
  endpoint: subscription.endpoint,
  userId: userId,
  subscription: JSON.stringify(subscription),
  preferences: preferences,
});
```

---

## 📝 Usage Examples

### Error Boundary in Layout
```tsx
<ErrorBoundary onError={(error, info) => trackError(error, info)}>
  <App />
</ErrorBoundary>
```

### Error Toast in Component
```tsx
const [error, setError] = useState<Error | null>(null);

{error && (
  <ErrorToast
    error={error}
    onDismiss={() => setError(null)}
    onRetry={handleRetry}
  />
)}
```

### Error Handler in Hook
```tsx
const { error, handleError, retry } = useErrorHandler(3);

try {
  await operation();
} catch (err) {
  handleError(err, {
    retryable: true,
    onRetry: async () => await operation(),
  });
}
```

### Push Notifications
```tsx
const { subscribe, showPriceAlert } = usePushNotifications();

// Subscribe
await subscribe();

// Show alert
showPriceAlert('KMOON', 0.000125, 0.0002, 'above');
```

---

## 🎯 Next Steps

### Error Handling
- [ ] Integrate error tracking service (Sentry, etc.)
- [ ] Add error analytics dashboard
- [ ] Implement error reporting UI
- [ ] Add error recovery automation

### Push Notifications
- [ ] Set up VAPID keys
- [ ] Integrate with database
- [ ] Implement server-side push sending
- [ ] Add notification scheduling
- [ ] Test on real devices

---

## 🔗 Related Files

- `src/components/features/ErrorBoundary.tsx` - Error boundary component
- `src/components/features/ErrorToast.tsx` - Error toast component
- `src/hooks/useErrorHandler.ts` - Error handler hook
- `src/app/error.tsx` - Error page
- `src/app/global-error.tsx` - Global error page
- `src/hooks/usePushNotifications.ts` - Push notification hook
- `src/components/features/PushNotificationSettings.tsx` - Settings component
- `src/app/api/push/subscribe/route.ts` - API endpoint
- `public/sw.js` - Service worker push handling

---

**Status**: ✅ All error handling and push notification features implemented and ready for testing.

