
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Category } from "../types";

// Always use process.env.API_KEY for the Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const REQUEST_TIMEOUT_MS = 20000;
const responseCache = new Map<string, { arabic: string; translation: string; category: string }>();
const IMAGE_REQUEST_TIMEOUT_MS = 30000;
const MAX_IMAGE_EXTRACTION_ATTEMPTS = 3;
const MAX_TEXT_AI_ATTEMPTS = 2;

// Apple requires AI/LLM apps to include safeguards for explicit/harmful content.
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

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

const extractStatusCode = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { status?: number; code?: number; response?: { status?: number } };
  if (typeof candidate.status === 'number') return candidate.status;
  if (typeof candidate.code === 'number') return candidate.code;
  if (typeof candidate.response?.status === 'number') return candidate.response.status;
  return null;
};

const isRetriableAiError = (error: unknown) => {
  const status = extractStatusCode(error);
  if (status === 429) return false;
  if (status === 503 || status === 504) return true;
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  if (msg.includes('429') || msg.includes('too many requests')) return false;
  return msg.includes('503') || msg.includes('service unavailable') || msg.includes('overloaded') || msg.includes('timeout');
};

const generateContentWithRetry = async (
  request: Parameters<typeof ai.models.generateContent>[0],
  timeoutMs = REQUEST_TIMEOUT_MS,
  maxAttempts = MAX_TEXT_AI_ATTEMPTS
) => {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await withTimeout(ai.models.generateContent(request), timeoutMs);
    } catch (error) {
      lastError = error;
      if (!isRetriableAiError(error) || attempt === maxAttempts - 1) {
        throw error;
      }
      await sleep(700 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('AI request failed.');
};

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
            safetySettings: SAFETY_SETTINGS,
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
  const response = await generateContentWithRetry({
    model,
    contents: `You are translating a dua from Arabic to English.
Return strict JSON: arabic, translation, category.

Rules:
- Keep the Arabic text exactly as provided.
- translation must be faithful, clear, and concise (no extra commentary).
- Do not invent words that are not in the Arabic text.
- category must be one of: ${Object.values(Category).join(', ')}.

Arabic:
"${cleaned}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: DUA_RESPONSE_SCHEMA,
      temperature: 0.05,
      safetySettings: SAFETY_SETTINGS,
    },
  });
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
  const response = await generateContentWithRetry({
    model,
    contents: `You are correcting OCR mistakes in Arabic dua text.
Return strict JSON with one field: arabic.

Rules:
- Keep it Arabic only.
- Fix obvious OCR joins/splits and letter mistakes.
- Do NOT add phrases, commentary, or extra words.
- Keep meaning exactly the same.

OCR text:
"${cleaned}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: OCR_ARABIC_CLEANUP_SCHEMA,
      temperature: 0,
      safetySettings: SAFETY_SETTINGS,
    },
  }, 12000, 1);

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
        safetySettings: SAFETY_SETTINGS,
      },
    }),
    25000
  );
  const parsed = normalizeResult(response.text);
  setCached(cacheKey, parsed);
  return parsed;
};
