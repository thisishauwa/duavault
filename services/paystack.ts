type PaystackPlanId = "monthly" | "yearly" | "lifetime";

type PaystackPlan = {
  id: PaystackPlanId;
  title: string;
  subtitle: string;
  amountKobo: number;
};

type LaunchPaystackCheckoutArgs = {
  email: string;
  plan: PaystackPlan;
  metadata?: Record<string, unknown>;
};

type PaystackHandler = {
  openIframe: () => void;
};

type PaystackCallbackResponse = {
  reference: string;
};

type PaystackSetupOptions = {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref: string;
  metadata?: Record<string, unknown>;
  callback: (response: PaystackCallbackResponse) => void;
  onClose: () => void;
};

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: PaystackSetupOptions) => PaystackHandler;
    };
  }
}

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as
  | string
  | undefined;

const PAYSTACK_SCRIPT_SRC = "https://js.paystack.co/v1/inline.js";
const PAYSTACK_STORAGE_KEY = "duaVault_premium";

const parseAmount = (value: string | undefined) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const PLAN_DEFINITIONS: PaystackPlan[] = [
  {
    id: "monthly",
    title: "Monthly",
    subtitle:
      (import.meta.env.VITE_PAYSTACK_MONTHLY_LABEL as string | undefined) ??
      "Monthly premium access",
    amountKobo: parseAmount(import.meta.env.VITE_PAYSTACK_MONTHLY_AMOUNT_KOBO),
  },
  {
    id: "yearly",
    title: "Yearly",
    subtitle:
      (import.meta.env.VITE_PAYSTACK_YEARLY_LABEL as string | undefined) ??
      "Yearly premium access",
    amountKobo: parseAmount(import.meta.env.VITE_PAYSTACK_YEARLY_AMOUNT_KOBO),
  },
  {
    id: "lifetime",
    title: "Lifetime",
    subtitle:
      (import.meta.env.VITE_PAYSTACK_LIFETIME_LABEL as string | undefined) ??
      "Lifetime premium access",
    amountKobo: parseAmount(import.meta.env.VITE_PAYSTACK_LIFETIME_AMOUNT_KOBO),
  },
];

let paystackScriptPromise: Promise<void> | null = null;

const loadPaystackScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Paystack is only available in the browser."));
  }

  if (window.PaystackPop) {
    return Promise.resolve();
  }

  if (paystackScriptPromise) {
    return paystackScriptPromise;
  }

  paystackScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${PAYSTACK_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Could not load Paystack checkout.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = PAYSTACK_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Paystack checkout."));
    document.head.appendChild(script);
  });

  return paystackScriptPromise;
};

const createReference = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `duavault_${crypto.randomUUID()}`;
  }

  return `duavault_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getAvailablePaystackPlans = () => {
  return PLAN_DEFINITIONS.filter((plan) => plan.amountKobo > 0);
};

export const getStoredPremiumState = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PAYSTACK_STORAGE_KEY) === "true";
};

export const setStoredPremiumState = (value: boolean) => {
  if (typeof window === "undefined") return;

  if (value) {
    window.localStorage.setItem(PAYSTACK_STORAGE_KEY, "true");
    return;
  }

  window.localStorage.removeItem(PAYSTACK_STORAGE_KEY);
};

export const launchPaystackCheckout = async ({
  email,
  plan,
  metadata,
}: LaunchPaystackCheckoutArgs) => {
  if (!PAYSTACK_PUBLIC_KEY) {
    throw new Error("Missing `VITE_PAYSTACK_PUBLIC_KEY`.");
  }

  if (!email) {
    throw new Error("An email address is required to start checkout.");
  }

  if (!plan.amountKobo) {
    throw new Error(`Missing Paystack amount for the ${plan.title.toLowerCase()} plan.`);
  }

  await loadPaystackScript();

  if (!window.PaystackPop) {
    throw new Error("Paystack checkout did not initialize correctly.");
  }

  return await new Promise<PaystackCallbackResponse>((resolve, reject) => {
    const handler = window.PaystackPop?.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount: plan.amountKobo,
      currency: "NGN",
      ref: createReference(),
      metadata: {
        custom_fields: [
          {
            display_name: "Plan",
            variable_name: "plan",
            value: plan.id,
          },
        ],
        ...metadata,
      },
      callback: (response) => resolve(response),
      onClose: () => reject(new Error("Payment cancelled.")),
    });

    if (!handler) {
      reject(new Error("Paystack checkout could not be opened."));
      return;
    }

    handler.openIframe();
  });
};

export type { PaystackPlan, PaystackPlanId };
