import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCharacterSprite = async (prompt: string): Promise<string> => {
  const ai = getClient();
  
  // Requesting a sprite sheet with 4 perfect views for skiing game
  const enhancedPrompt = `
    Create a 4-frame character sprite sheet for a Nintendo 64 skiing game.
    The character is: ${prompt}.
    
    STYLE: Low-poly N64 aesthetic, chunky shapes, bright saturated colors, flat shading.
    
    EXACTLY 4 FRAMES IN A HORIZONTAL ROW (left to right):
    
    [1] FRONT - Character facing the camera. Full face visible, looking directly at viewer. Arms may hold ski poles.
    
    [2] BACK - Character facing away from camera. Back of head, back of body, NO face visible. This is what you see when following someone skiing downhill.
    
    [3] BACK-LEFT - Character facing away but turned 45° to their left. Back of head visible, left side of body more prominent than right. Skiing away and veering left.
    
    [4] BACK-RIGHT - Character facing away but turned 45° to their right. Back of head visible, right side of body more prominent than left. Skiing away and veering right.
    
    CONSISTENCY IS CRITICAL:
    - Same character, same outfit, same colors in ALL 4 frames
    - Same proportions and size in each frame
    - Equal spacing between frames
    - Character centered in each frame cell
    
    STRICT RULES:
    - SOLID WHITE BACKGROUND (#FFFFFF) - nothing else
    - NO TEXT whatsoever - no labels, numbers, words, or annotations
    - NO shadows on ground
    - NO UI elements or decorations
    - Character artwork ONLY
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Nano Banana - Gemini 2.5 Flash image generation
      contents: {
        parts: [
          {
            text: enhancedPrompt,
          },
        ],
      },
      config: {
        // Use 16:9 to provide width for the sprite sheet row
        // @ts-ignore
        imageConfig: {
          aspectRatio: "16:9",
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No candidates returned from Gemini.");
    }

    const content = response.candidates[0].content;
    let textOutput = '';
    
    // Iterate through parts to find the image
    if (content && content.parts) {
      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64EncodeString = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${base64EncodeString}`;
        }
        if (part.text) {
          textOutput += part.text;
        }
      }
    }

    if (textOutput) {
       // If the model returned text, it probably refused the image generation.
       throw new Error(`Gemini returned text: ${textOutput.substring(0, 200)}`);
    }

    throw new Error("No image data found in the response.");

  } catch (error: any) {
    console.error("Gemini generation error:", error);
    throw new Error(error.message || "Failed to generate image");
  }
};