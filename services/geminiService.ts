
import { GoogleGenAI, Type } from "@google/genai";

export const fetchThemedWords = async (theme: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate exactly 5 words related to the theme "${theme}". 
                 Each word must be between 3 and 7 letters long. 
                 Provide only common, easy-to-spell words.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            words: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["words"]
        }
      }
    });

    const data = JSON.parse(response.text);
    return data.words.map((w: string) => w.toUpperCase().replace(/[^A-Z]/g, ''));
  } catch (error) {
    console.error("Gemini Error:", error);
    // Fallback words if API fails
    return ["REACT", "CODE", "NODE", "HTML", "GRID"];
  }
};
