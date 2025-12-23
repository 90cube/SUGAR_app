
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_GEMINI_MODEL } from "../constants";
import { UserProfile } from "../types";

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

  public async analyzeMatchup(myProfile: UserProfile, opponentProfile: UserProfile): Promise<string> {
    if (!this.ai) return "Gemini API Key is missing. Cannot perform analysis.";

    const formatStats = (p: UserProfile) => {
      const stats = p.recentStats || { kd: 0, winRate: 0, sniperRate: 0, assaultRate: 0 };
      return `
        - Nickname: ${p.nickname}
        - Tier: ${p.soloTier.tierName} (Score: ${p.soloTier.score})
        - K/D: ${stats.kd}%
        - Win Rate: ${stats.winRate}%
        - Sniper Usage: ${stats.sniperRate}%
        - Assault Usage: ${stats.assaultRate}%
      `;
    };

    const prompt = `
      You are a professional analyst for the FPS game 'Sudden Attack'.
      Compare the following two players and predict the match outcome and strategy for Player A (Me).

      Player A (Me):
      ${formatStats(myProfile)}

      Player B (Opponent):
      ${formatStats(opponentProfile)}

      Please provide the analysis in the following format (Korean):
      1. **Estimated Win Rate**: (Percentage)
      2. **Opponent Style**: (Briefly analyze if they are a sniper, rusher, etc based on usage rates)
      3. **Strategic Advice**: (3 bullet points on how Player A should play to win. Be specific about countering their weapon type and stats)
      
      Keep the tone professional, tactical, and encouraging.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
      });
      return response.text || "Analysis failed.";
    } catch (error) {
      console.error("Matchup Analysis Error:", error);
      return "Failed to generate analysis due to an API error.";
    }
  }
}

export const geminiService = new GeminiService();
