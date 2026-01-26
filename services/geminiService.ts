
import { GoogleGenAI, Type } from "@google/genai";
import { Category } from "../types";

// Always use process.env.API_KEY for the Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const processDuaFromImage = async (base64Image: string) => {
  const model = 'gemini-3-flash-preview';
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } },
        { 
          text: `You are an expert in Islamic liturgy and Arabic calligraphy. 
          1. Extract the Arabic dua from this image with 100% accuracy.
          2. Correct any obvious OCR typos using your knowledge of famous duas.
          3. Provide a beautiful English translation.
          4. Categorize as one of: ${Object.values(Category).join(', ')}.
          Return ONLY JSON.` 
        },
      ],
    },
    config: { 
      responseMimeType: "application/json", 
      responseSchema: DUA_RESPONSE_SCHEMA,
      temperature: 0.2
    },
  });
  return JSON.parse(response.text);
};

export const processDuaFromText = async (arabicText: string) => {
  const model = 'gemini-3-flash-preview';
  const response = await ai.models.generateContent({
    model,
    contents: `Analyze this Arabic dua: "${arabicText}". Provide a faithful English translation and categorize it as one of: ${Object.values(Category).join(', ')}. Return JSON.`,
    config: { 
      responseMimeType: "application/json", 
      responseSchema: DUA_RESPONSE_SCHEMA,
      temperature: 0.3
    },
  });
  return JSON.parse(response.text);
};

export const processDuaFromUrl = async (url: string) => {
  const model = 'gemini-3-flash-preview';
  const response = await ai.models.generateContent({
    model,
    contents: `Find and extract the main Arabic dua from this website: ${url}. Provide the Arabic text, a beautiful English translation, and the correct category. Return ONLY JSON.`,
    config: { 
      responseMimeType: "application/json", 
      responseSchema: DUA_RESPONSE_SCHEMA,
      tools: [{ googleSearch: {} }],
      temperature: 0.2
    },
  });
  return JSON.parse(response.text);
};
