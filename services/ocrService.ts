import { PSM, createWorker } from 'tesseract.js';
import stableCorePath from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url';

type OcrResult = {
  arabic: string;
  confidence: number;
  rawText: string;
};

let workerPromise: Promise<any> | null = null;

// Arabic blocks + presentation forms for broader script coverage.
const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const NON_ARABIC_ALLOWED_REGEX = /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u0640\u061F\u060C\u061B]/g;
const MIN_WORD_CONFIDENCE = 35;

const hasArabic = (text: string) => ARABIC_CHAR_REGEX.test(text);

const sanitizeArabicChunk = (text: string) => {
  return text
    .replace(NON_ARABIC_ALLOWED_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeArabic = (text: string) => {
  return sanitizeArabicChunk(
    text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => hasArabic(line))
      .join(' ')
  );
};

const normalizeArabicFromWords = (words: Array<{ text?: string; confidence?: number }>) => {
  const extracted = words
    .filter((word) => (word.confidence ?? 0) >= MIN_WORD_CONFIDENCE)
    .map((word) => (word.text ?? '').trim())
    .filter((token) => hasArabic(token))
    .map((token) => sanitizeArabicChunk(token))
    .filter(Boolean)
    .join(' ');
  return extracted.replace(/\s+/g, ' ').trim();
};

type OcrWord = {
  text?: string;
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};

const normalizeArabicFromWordLayout = (words: OcrWord[]) => {
  const candidates = words
    .filter((word) => (word.confidence ?? 0) >= MIN_WORD_CONFIDENCE)
    .map((word) => {
      const text = sanitizeArabicChunk((word.text ?? '').trim());
      const bbox = word.bbox;
      return { text, bbox };
    })
    .filter((entry) => entry.text && hasArabic(entry.text) && entry.bbox) as Array<{
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;

  if (candidates.length === 0) return '';

  // Group tokens into lines by y-center proximity.
  const lines: Array<{ y: number; tokens: typeof candidates }> = [];
  for (const token of candidates) {
    const yCenter = (token.bbox.y0 + token.bbox.y1) / 2;
    const line = lines.find((l) => Math.abs(l.y - yCenter) < 18);
    if (!line) {
      lines.push({ y: yCenter, tokens: [token] });
    } else {
      line.tokens.push(token);
      line.y = (line.y + yCenter) / 2;
    }
  }

  // Sort lines top->bottom. For each line sort tokens right->left (Arabic reading order).
  lines.sort((a, b) => a.y - b.y);
  const text = lines
    .map((line) =>
      line.tokens
        .sort((a, b) => b.bbox.x1 - a.bbox.x1)
        .map((t) => t.text)
        .join(' ')
    )
    .join('\n');

  return normalizeArabic(text);
};

const loadImage = async (dataUrl: string): Promise<HTMLImageElement> => {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image for OCR.'));
    img.src = dataUrl;
  });
};

const toDataUrlVariant = async (
  dataUrl: string,
  options: { scale: number; contrast: number; grayscale: boolean }
) => {
  const img = await loadImage(dataUrl);
  const width = Math.max(1, Math.round(img.width * options.scale));
  const height = Math.max(1, Math.round(img.height * options.scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable for OCR preprocessing.');

  if (options.grayscale || options.contrast !== 100) {
    ctx.filter = `${options.grayscale ? 'grayscale(100%) ' : ''}contrast(${options.contrast}%)`;
  } else {
    ctx.filter = 'none';
  }
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.92);
};

const getWorker = async () => {
  if (!workerPromise) {
    workerPromise = createWorker('ara', 1, {
      langPath: 'https://tessdata.projectnaptha.com/4.0.0_best',
      // Force the stable non-SIMD LSTM core to avoid relaxedsimd runtime aborts on some devices.
      corePath: stableCorePath,
      logger: () => {},
      logging: false,
    });
  }
  const worker = await workerPromise;
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: '1',
    tessedit_do_invert: '0',
    tessedit_fix_fuzzy_spaces: '1',
    // Bias decoder away from Latin punctuation/noise and toward Arabic word shapes.
    language_model_penalty_non_dict_word: '0.05',
    language_model_penalty_non_freq_dict_word: '0.05',
    debug_file: '/ocr-debug.log',
  });
  return worker;
};

export const extractArabicFromImage = async (dataUrl: string): Promise<OcrResult> => {
  const worker = await getWorker();
  const variants = [
    { data: dataUrl, psm: PSM.AUTO },
    { data: await toDataUrlVariant(dataUrl, { scale: 1.4, contrast: 140, grayscale: true }), psm: PSM.SINGLE_BLOCK },
    { data: await toDataUrlVariant(dataUrl, { scale: 1.8, contrast: 175, grayscale: true }), psm: PSM.SINGLE_LINE },
  ];

  let best: OcrResult | null = null;
  for (const variant of variants) {
    await worker.setParameters({
      tessedit_pageseg_mode: variant.psm,
      preserve_interword_spaces: '1',
    });

    const { data } = await worker.recognize(variant.data);
    const words = Array.isArray((data as { words?: unknown }).words)
      ? ((data as { words: Array<{ text?: string; confidence?: number }> }).words)
      : [];
    const arabicByLayout = normalizeArabicFromWordLayout(words as OcrWord[]);
    const arabicFromWords = normalizeArabicFromWords(words);
    const arabic = arabicByLayout.length > 0
      ? arabicByLayout
      : arabicFromWords.length > 0
        ? arabicFromWords
        : normalizeArabic(data.text ?? '');
    const candidate: OcrResult = {
      arabic,
      confidence: data.confidence ?? 0,
      rawText: data.text ?? '',
    };

    const candidateScore = candidate.arabic.length + candidate.confidence * 0.2;
    const bestScore = best ? best.arabic.length + best.confidence * 0.2 : -1;
    if (!best || candidateScore > bestScore) {
      best = candidate;
    }
    if (candidate.arabic.length >= 20) break;
  }

  if (!best || best.arabic.length < 6) {
    throw new Error('OCR could not find clear Arabic text.');
  }
  return best;
};
