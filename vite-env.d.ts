/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_SUPABASE_URL: string;
  readonly VITE_PUBLIC_SUPABASE_ANON_KEY: string;
  readonly VITE_PAYSTACK_PUBLIC_KEY: string;
  readonly VITE_PAYSTACK_MONTHLY_AMOUNT_KOBO?: string;
  readonly VITE_PAYSTACK_YEARLY_AMOUNT_KOBO?: string;
  readonly VITE_PAYSTACK_LIFETIME_AMOUNT_KOBO?: string;
  readonly VITE_PAYSTACK_MONTHLY_LABEL?: string;
  readonly VITE_PAYSTACK_YEARLY_LABEL?: string;
  readonly VITE_PAYSTACK_LIFETIME_LABEL?: string;
  readonly GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
