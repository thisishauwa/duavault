
import { GoogleGenAI, Type } from "@google/genai";
import { Category } from "../types";

// Always use process.env.API_KEY for the Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const REQUEST_TIMEOUT_MS = 20000;
const responseCache = new Map<string, { arabic: string; translation: string; category: string }>();

const DUA_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    arabic: {
      type: Type.STRING,
      description: 'The extracted Arabic text. Include all diacritics (harakat) if visible.',
    },
    translation: {
      type: Type.STRING,
      description: 'A poetic and faithful English translation of the spiritual meaning.',
    },
    category: {
      type: Type.STRING,
      description: 'The most appropriate category.',
    },
  },
  required: ['arabic', 'translation', 'category'],
};

const DUA_ARABIC_ONLY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    arabic: {
      type: Type.STRING,
      description: 'The extracted Arabic text. Include all diacritics (harakat) if visible.',
    },
    category: {
      type: Type.STRING,
      description: 'The most appropriate category.',
    },
  },
  required: ['arabic', 'category'],
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> => {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('AI request timed out. Please try again.')), timeoutMs);
    }),
  ]);
};

const normalizeCategory = (value: string): Category => {
  const allowed = Object.values(Category);
  if (allowed.includes(value as Category)) return value as Category;
  return Category.General;
};

const normalizeResult = (raw: string) => {
  const parsed = JSON.parse(raw) as { arabic?: string; translation?: string; category?: string };
  return {
    arabic: (parsed.arabic ?? '').trim(),
    translation: (parsed.translation ?? '').trim(),
    category: normalizeCategory(parsed.category ?? Category.General),
  };
};

const getCached = (key: string) => responseCache.get(key);
const setCached = (key: string, value: { arabic: string; translation: string; category: string }) => {
  responseCache.set(key, value);
};

export const processDuaFromImage = async (base64Image: string, includeTranslation = true) => {
  const cacheKey = `img:${includeTranslation ? 'full' : 'arabic'}:${base64Image.slice(0, 120)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const model = 'gemini-3-flash-preview';
  const response = await withTimeout(
    ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } },
          {
            text: `Extract one Arabic dua from this image and return JSON with:
            arabic, ${includeTranslation ? 'translation, ' : ''}category.
            category must be one of: ${Object.values(Category).join(', ')}.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: includeTranslation ? DUA_RESPONSE_SCHEMA : DUA_ARABIC_ONLY_RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    })
  );
  const parsed = normalizeResult(response.text);
  setCached(cacheKey, parsed);
  return parsed;
};

export const processDuaFromText = async (arabicText: string) => {
  const cleaned = arabicText.trim();
  const cacheKey = `txt:${cleaned}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const model = 'gemini-3-flash-preview';
  const response = await withTimeout(
    ai.models.generateContent({
      model,
      contents: `Translate this Arabic dua and categorize it. Return JSON with arabic, translation, category. Categories: ${Object.values(Category).join(', ')}.
      Arabic: "${cleaned}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: DUA_RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    })
  );
  const parsed = normalizeResult(response.text);
  setCached(cacheKey, parsed);
  return parsed;
};

export const processDuaFromUrl = async (url: string, includeTranslation = true) => {
  const cleanedUrl = url.trim();
  const cacheKey = `url:${includeTranslation ? 'full' : 'arabic'}:${cleanedUrl}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const model = 'gemini-3-flash-preview';
  const response = await withTimeout(
    ai.models.generateContent({
      model,
      contents: `Extract the main Arabic dua from this URL and return JSON with arabic, ${includeTranslation ? 'translation, ' : ''}category.
      URL: ${cleanedUrl}
      Categories: ${Object.values(Category).join(', ')}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: includeTranslation ? DUA_RESPONSE_SCHEMA : DUA_ARABIC_ONLY_RESPONSE_SCHEMA,
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    }),
    25000
  );
  const parsed = normalizeResult(response.text);
  setCached(cacheKey, parsed);
  return parsed;
};
