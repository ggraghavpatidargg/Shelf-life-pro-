import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface RecognizedFood {
  name: string;
  category: string;
  estimatedExpiryDays: number;
  confidence: number;
}

export const recognizeFood = async (base64Image: string): Promise<RecognizedFood | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "Identify the food item in this image. Provide the name, a broad category (e.g., Dairy, Produce, Bakery, Meat, Pantry), and an estimated shelf life in days from today. Respond in JSON format.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            estimatedExpiryDays: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER },
          },
          required: ["name", "category", "estimatedExpiryDays"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as RecognizedFood;
  } catch (error) {
    console.error("Error recognizing food:", error);
    return null;
  }
};

export interface RecipeSuggestion {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
}

export const recognizeFoodList = async (base64Image: string): Promise<RecognizedFood[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "Extract a list of food items from this image (e.g., a receipt or handwritten list). For each item, provide: name, a broad category (Dairy, Produce, Bakery, Meat, Pantry, Frozen, Beverages), and an estimated shelf life in days from today. Respond in JSON format as an array of objects.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              estimatedExpiryDays: { type: Type.NUMBER },
            },
            required: ["name", "category", "estimatedExpiryDays"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as RecognizedFood[];
  } catch (error) {
    console.error("Error recognizing food list:", error);
    return [];
  }
};

export const suggestRecipes = async (ingredients: string[]): Promise<RecipeSuggestion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            text: `Based on these available ingredients: ${ingredients.join(", ")}, suggest 3 healthy and creative recipes. For each recipe, provide a title, a short description, used ingredients from the list, simple instructions, and estimated prep time. Focus on reducing waste by using the provided ingredients efficiently. Respond in JSON format.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
              instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
              prepTime: { type: Type.STRING },
            },
            required: ["title", "description", "ingredients", "instructions", "prepTime"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as RecipeSuggestion[];
  } catch (error) {
    console.error("Error suggesting recipes:", error);
    return [];
  }
};

export interface RepurposeSuggestion {
  title: string;
  fix: string;
  newDish: string;
}

export const repurposeItem = async (itemDescription: string): Promise<RepurposeSuggestion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            text: `The user has a food item or a dish that hasn't turned out right: "${itemDescription}". Provide 3 creative ways to fix it or repurpose it into something else delicious. For each, provide a catchy title, a brief "how to fix" explanation, and what the resulting dish would be. Respond in JSON format.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              fix: { type: Type.STRING },
              newDish: { type: Type.STRING },
            },
            required: ["title", "fix", "newDish"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as RepurposeSuggestion[];
  } catch (error) {
    console.error("Error repurposing item:", error);
    return [];
  }
};
export interface IngredientSubstitute {
  name: string;
  reason: string;
}

export const suggestAlternatives = async (ingredient: string): Promise<IngredientSubstitute[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            text: `Provide 3 common and accessible substitutes for ${ingredient} in cooking. For each, explain briefly why it works as a replacement. Respond in JSON format.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ["name", "reason"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as IngredientSubstitute[];
  } catch (error) {
    console.error("Error suggesting alternatives:", error);
    return [];
  }
};
