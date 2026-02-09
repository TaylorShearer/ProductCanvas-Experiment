/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

export async function generateImage(
  ai: GoogleGenAI,
  { prompt }: { prompt: string },
): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
  });

  for (const part of response.candidates?.[0].content?.parts || []) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data || "";
      return `data:image/png;base64,${imageData}`;
    }
  }

  throw new Error("No images were generated");
}
