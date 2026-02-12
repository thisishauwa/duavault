
import { GoogleGenAI, Type } from "@google/genai";
import { Category } from "../types";

// Always use process.env.API_KEY for the Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const REQUEST_TIMEOUT_MS = 20000;
const responseCache = new Map<string, { arabic: string; translation: string; category: string }>();
const IMAGE_REQUEST_TIMEOUT_MS = 30000;
const MAX_IMAGE_EXTRACTION_ATTEMPTS = 3;

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

const OCR_ARABIC_CLEANUP_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    arabic: {
      type: Type.STRING,
      description: 'Arabic text corrected from OCR artifacts with minimal edits.',
    },
  },
  required: ['arabic'],
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

const hasArabicContent = (value: string) => /[\u0600-\u06FF]/.test(value);
const isValidArabicExtraction = (arabic: string) => {
  const cleaned = arabic.replace(/\s+/g, ' ').trim();
  return cleaned.length >= 8 && hasArabicContent(cleaned);
};

const getInlineImagePart = (base64Image: string) => {
  // Supports data URLs (png/jpeg/webp) and raw base64.
  if (base64Image.startsWith('data:')) {
    const [meta, data] = base64Image.split(',', 2);
    const mimeMatch = /data:(.*?);base64/.exec(meta);
    return {
      mimeType: mimeMatch?.[1] ?? 'image/jpeg',
      data,
    };
  }
  return {
    mimeType: 'image/jpeg',
    data: base64Image,
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getCached = (key: string) => responseCache.get(key);
const setCached = (key: string, value: { arabic: string; translation: string; category: string }) => {
  responseCache.set(key, value);
};

const normalizeArabicOnly = (raw: string) => {
  const parsed = JSON.parse(raw) as { arabic?: string };
  return (parsed.arabic ?? '').trim();
};

export const processDuaFromImage = async (base64Image: string, includeTranslation = true) => {
  const cacheKey = `img:${includeTranslation ? 'full' : 'arabic'}:${base64Image.slice(0, 120)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const model = 'gemini-3-flash-preview';
  const imagePart = getInlineImagePart(base64Image);
  const prompts = [
    `Extract one Arabic dua from this image and return JSON with:
arabic, ${includeTranslation ? 'translation, ' : ''}category.
Rules:
- Preserve Arabic exactly as shown.
- Ignore UI chrome, logos, and decorative text.
- category must be one of: ${Object.values(Category).join(', ')}.`,
    `Read ONLY the main Arabic dua text in the image.
Return JSON with arabic, ${includeTranslation ? 'translation, ' : ''}category.
If multiple Arabic blocks appear, choose the central/primary dua block.
category must be one of: ${Object.values(Category).join(', ')}.`,
    `High-accuracy OCR pass:
Extract the Arabic dua text faithfully (with diacritics when visible) and return JSON:
arabic, ${includeTranslation ? 'translation, ' : ''}category.
Do not paraphrase Arabic. category must be one of: ${Object.values(Category).join(', ')}.`,
  ];

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_IMAGE_EXTRACTION_ATTEMPTS; attempt += 1) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: {
            parts: [
              { inlineData: imagePart },
              { text: prompts[Math.min(attempt, prompts.length - 1)] },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: includeTranslation ? DUA_RESPONSE_SCHEMA : DUA_ARABIC_ONLY_RESPONSE_SCHEMA,
            temperature: 0.05,
          },
        }),
        IMAGE_REQUEST_TIMEOUT_MS
      );

      const parsed = normalizeResult(response.text);
      if (!isValidArabicExtraction(parsed.arabic)) {
        throw new Error('No reliable Arabic text detected.');
      }

      setCached(cacheKey, parsed);
      return parsed;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_IMAGE_EXTRACTION_ATTEMPTS - 1) {
        await sleep(300 * (attempt + 1));
      }
    }
  }

  throw new Error(
    lastError instanceof Error
      ? lastError.message
      : 'Could not reliably extract Arabic text from this image.'
  );
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

export const cleanupArabicOcrText = async (arabicText: string) => {
  const cleaned = arabicText.trim();
  if (!cleaned) return cleaned;

  const cacheKey = `ocr-clean:${cleaned}`;
  const cached = getCached(cacheKey);
  if (cached) return cached.arabic;

  const model = 'gemini-3-flash-preview';
  const response = await withTimeout(
    ai.models.generateContent({
      model,
      contents: `You are correcting OCR mistakes in Arabic dua text.
Return JSON with only one field: arabic.

Rules:
- Keep it Arabic only.
- Fix obvious OCR joins/splits and letter mistakes.
- Do NOT add new sentences or extra phrases.
- Preserve the intended wording as closely as possible.

OCR text:
"${cleaned}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: OCR_ARABIC_CLEANUP_SCHEMA,
        temperature: 0,
      },
    }),
    12000
  );

  const fixedArabic = normalizeArabicOnly(response.text) || cleaned;
  const result = {
    arabic: fixedArabic,
    translation: '',
    category: Category.General,
  };
  setCached(cacheKey, result);
  return fixedArabic;
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
