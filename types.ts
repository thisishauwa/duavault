
export enum Category {
  MorningEvening = 'Morning/Evening',
  Travel = 'Travel',
  Food = 'Food',
  Sleep = 'Sleep',
  Protection = 'Protection',
  Gratitude = 'Gratitude',
  General = 'General',
  Other = 'Other'
}

export interface Dua {
  id: string;
  arabic: string;
  translation: string;
  category: Category;
  isFavorite: boolean;
  createdAt: number;
  source: 'screenshot' | 'link' | 'manual';
  userId?: string; // Optional for anonymous users
}

export type View = 'library' | 'detail' | 'add' | 'onboarding' | 'settings' | 'paywall' | 'auth';
