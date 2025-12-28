
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Correctly initialize GoogleGenAI with the API key from environment variables
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateSKKNContent(prompt: string, history: {role: 'user' | 'model', parts: {text: string}[]}[] = []) {
    try {
      // Use generateContentStream directly with model name and contents
      const chat = this.ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: [
          ...history.map(h => ({ role: h.role, parts: h.parts })),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.65,
          topP: 0.95,
          topK: 40,
        },
      });
      return chat;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }

  async extractStructureFromFile(base64Data: string, mimeType: string): Promise<string> {
    try {
      // Use generateContent with model name and contents for extraction
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: "Hãy trích xuất khung cấu trúc (dàn ý) của tài liệu này. Chỉ trả về các đầu mục (ví dụ: Phần I, Chương 1, Mục 1.1...). Định dạng dưới dạng văn bản thuần túy, liệt kê từ trên xuống dưới."
            }
          ]
        },
        config: {
          temperature: 0.1, // Thấp để trích xuất chính xác
        }
      });
      // Access .text property directly
      return response.text || '';
    } catch (error) {
      console.error("Extraction Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
