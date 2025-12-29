
import { GoogleGenAI, Type } from "@google/genai";
import { IssueType } from "../types";

export const getTroubleshootingTips = async (description: string, type: IssueType) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User is reporting an issue with their ${type}. 
      Issue Description: "${description}".
      
      Provide exactly 3 concise, technical troubleshooting steps that a non-technical resident could try immediately. 
      Format the response as a JSON array of objects with "title" and "suggestion" fields.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              suggestion: { type: Type.STRING }
            },
            required: ["title", "suggestion"]
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};
