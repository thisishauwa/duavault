# RevenueCat Setup (Capacitor + React)

This app uses RevenueCat dynamic offerings and paywalls on native iOS/Android.

## 1) Install SDKs

Already done in this repo:

- `@revenuecat/purchases-capacitor`
- `@revenuecat/purchases-capacitor-ui`

Then run:

```bash
npm run build:mobile
```

## 2) Configure environment variables

Set these in `.env.local`:

```env
VITE_REVENUECAT_API_KEY=test_jHOZtuKtQFiUwMURDZjpSPxXJKV
# Optional:
VITE_REVENUECAT_PLACEMENT_ID=
VITE_REVENUECAT_OFFERING_ID=
```

How offering selection works in app:

1. Placement (`VITE_REVENUECAT_PLACEMENT_ID`) if provided
2. Offering ID (`VITE_REVENUECAT_OFFERING_ID`) if provided
3. RevenueCat `current` offering fallback

## 3) RevenueCat dashboard configuration

### Entitlement

Create entitlement:

- Identifier: `Dua Vault Pro`

### Products

Create products:

- `monthly`
- `yearly`
- `lifetime`

Map each to the corresponding App Store / Play Console product.

### Offering

Create an offering and attach packages for monthly/yearly/lifetime.
Set it as Default Offering (or serve by placement/targeting).

## 4) Paywall and purchase behavior in app

The app uses RevenueCat Paywalls UI:

- Open paywall from paywall screen (`presentPaywall`)
- Manage billing from Settings (`presentCustomerCenter`)
- Restore purchases in Settings (`restorePurchases`)
- Premium access is controlled by entitlement `Dua Vault Pro`

## 5) Entitlement checking

The app checks `customerInfo.entitlements.active` and treats user as premium when `Dua Vault Pro` is active.

## 6) Customer info retrieval

On app auth/session setup:

- RevenueCat is initialized
- RevenueCat user is synced (`logIn` / `logOut`)
- `getCustomerInfo()` is fetched
- premium state is updated from entitlement

## 7) Error handling and best practices

- All billing actions are wrapped in `try/catch` with user-safe alerts
- If paywall fails, app does not crash
- Restore purchases is available to users
- Customer Center is available for subscription management
- Product display should use dynamic offerings/packages, not hardcoded UI text/prices

## 8) Testing checklist

1. Launch app on device/simulator with StoreKit config/sandbox account.
2. Confirm paywall opens.
3. Purchase a package.
4. Verify premium state changes.
5. Relaunch app and verify entitlement persists.
6. Open Customer Center from Settings.
7. Trigger Restore Purchases and verify no regression.
