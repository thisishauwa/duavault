import { Capacitor } from '@capacitor/core';
import { LOG_LEVEL, Purchases, type CustomerInfo, type PurchasesOfferings, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';

export const DUA_VAULT_PRO_ENTITLEMENT = 'Dua Vault Pro';
export type RevenueCatPlanId = 'monthly' | 'yearly' | 'lifetime';
export const REVENUECAT_PRODUCT_IDS = {
  monthly: 'monthly',
  yearly: 'yearly',
  lifetime: 'lifetime',
} as const;

const REVENUECAT_OFFERING_ID = import.meta.env.VITE_REVENUECAT_OFFERING_ID as string | undefined;
const REVENUECAT_PLACEMENT_ID = import.meta.env.VITE_REVENUECAT_PLACEMENT_ID as string | undefined;

const ENTITLEMENT_FALLBACKS = [
  DUA_VAULT_PRO_ENTITLEMENT,
  'dua_vault_pro',
  'pro',
  'pro_access',
];

const REVENUECAT_API_KEY =
  import.meta.env.VITE_REVENUECAT_API_KEY ?? 'test_jHOZtuKtQFiUwMURDZjpSPxXJKV';

let isConfigured = false;

const isNative = () => Capacitor.isNativePlatform();

const normalizeEntitlementKey = (value: string) => value.toLowerCase().replace(/[\s-]+/g, '_');

export const hasDuaVaultProEntitlement = (customerInfo: CustomerInfo | null | undefined) => {
  if (!customerInfo) return false;
  const active = customerInfo.entitlements.active ?? {};
  const activeKeys = Object.keys(active);
  return activeKeys.some((key) =>
    ENTITLEMENT_FALLBACKS.some(
      (candidate) => normalizeEntitlementKey(candidate) === normalizeEntitlementKey(key)
    )
  );
};

export const derivePlanFromCustomerInfo = (customerInfo: CustomerInfo | null | undefined): RevenueCatPlanId | 'free' => {
  if (!hasDuaVaultProEntitlement(customerInfo)) return 'free';

  const info = customerInfo as unknown as { activeSubscriptions?: string[] };
  const activeSubscriptions = info.activeSubscriptions ?? [];
  const joined = activeSubscriptions.join(' ').toLowerCase();
  if (joined.includes(REVENUECAT_PRODUCT_IDS.yearly)) return 'yearly';
  if (joined.includes(REVENUECAT_PRODUCT_IDS.monthly)) return 'monthly';
  if (joined.includes(REVENUECAT_PRODUCT_IDS.lifetime)) return 'lifetime';
  return 'monthly';
};

export const initializeRevenueCat = async (appUserId?: string) => {
  if (!isNative()) return false;
  if (!REVENUECAT_API_KEY) return false;

  if (!isConfigured) {
    await Purchases.setLogLevel({
      level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO,
    });
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: appUserId,
    });
    isConfigured = true;
    return true;
  }

  return true;
};

export const syncRevenueCatUser = async (appUserId?: string) => {
  if (!isNative()) return null;
  await initializeRevenueCat(appUserId);

  if (appUserId) {
    const { customerInfo } = await Purchases.logIn({ appUserID: appUserId });
    return customerInfo;
  }

  const { customerInfo } = await Purchases.logOut();
  return customerInfo;
};

export const getRevenueCatCustomerInfo = async () => {
  if (!isNative()) return null;
  await initializeRevenueCat();
  const { customerInfo } = await Purchases.getCustomerInfo();
  return customerInfo;
};

export const getRevenueCatOfferings = async (): Promise<PurchasesOfferings | null> => {
  if (!isNative()) return null;
  await initializeRevenueCat();
  return await Purchases.getOfferings();
};

const resolveRevenueCatOffering = async () => {
  await initializeRevenueCat();

  if (REVENUECAT_PLACEMENT_ID) {
    const placementOffering = await Purchases.getCurrentOfferingForPlacement({
      placementIdentifier: REVENUECAT_PLACEMENT_ID,
    });
    if (placementOffering) return placementOffering;
  }

  const offerings = await getRevenueCatOfferings();
  if (!offerings) return null;

  if (REVENUECAT_OFFERING_ID && offerings.all?.[REVENUECAT_OFFERING_ID]) {
    return offerings.all[REVENUECAT_OFFERING_ID];
  }

  return offerings.current ?? null;
};

export const getDuaVaultPackages = async (): Promise<{
  monthly?: PurchasesPackage;
  yearly?: PurchasesPackage;
  lifetime?: PurchasesPackage;
}> => {
  const offering = await resolveRevenueCatOffering();
  const typedOffering = offering as {
    monthly?: PurchasesPackage;
    annual?: PurchasesPackage;
    lifetime?: PurchasesPackage;
    availablePackages?: PurchasesPackage[];
  } | null;
  const packages = typedOffering?.availablePackages ?? [];

  const findByKeyword = (keyword: string) =>
    packages.find(
      (pkg) =>
        pkg?.identifier?.toLowerCase().includes(keyword) ||
        pkg?.product?.identifier?.toLowerCase().includes(keyword)
    );

  return {
    monthly: typedOffering?.monthly ?? findByKeyword(REVENUECAT_PRODUCT_IDS.monthly),
    yearly: typedOffering?.annual ?? findByKeyword(REVENUECAT_PRODUCT_IDS.yearly),
    lifetime: typedOffering?.lifetime ?? findByKeyword(REVENUECAT_PRODUCT_IDS.lifetime),
  };
};

export const getPackageDisplayPrice = (pkg?: PurchasesPackage) => {
  if (!pkg) return null;
  const product = pkg.product as unknown as { priceString?: string; price?: number; currencyCode?: string };
  if (product.priceString) return product.priceString;
  if (typeof product.price === 'number' && product.currencyCode) {
    return `${product.currencyCode} ${product.price.toFixed(2)}`;
  }
  return null;
};

export const purchaseRevenueCatPackage = async (pkg: PurchasesPackage) => {
  if (!isNative()) return null;
  await initializeRevenueCat();
  const result = await Purchases.purchasePackage({ aPackage: pkg });
  return result.customerInfo;
};

export const presentDuaVaultPaywall = async () => {
  if (!isNative()) return null;
  await initializeRevenueCat();
  const offering = await resolveRevenueCatOffering();

  if (offering) {
    return await RevenueCatUI.presentPaywall({
      offering,
      displayCloseButton: true,
    });
  }

  return await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: DUA_VAULT_PRO_ENTITLEMENT,
    displayCloseButton: true,
  });
};

export const presentRevenueCatCustomerCenter = async () => {
  if (!isNative()) return;
  await initializeRevenueCat();
  await RevenueCatUI.presentCustomerCenter();
};

export const restoreRevenueCatPurchases = async () => {
  if (!isNative()) return null;
  await initializeRevenueCat();
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
};
