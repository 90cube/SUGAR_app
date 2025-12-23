import { GoogleGenAI } from "@google/genai";
import { DEFAULT_GEMINI_MODEL } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    } else if (process.env.API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }

  public initialize(apiKey: string): void {
    this.ai = new GoogleGenAI({ apiKey });
  }

  public async generateText(prompt: string): Promise<string> {
    if (!this.ai) {
      console.warn("Gemini Service: API Key not found. Returning mock response for scaffold.");
      return "Gemini service is not initialized with an API key yet.";
    }

    try {
      const response = await this.ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
      });
      
      return response.text || "";
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
