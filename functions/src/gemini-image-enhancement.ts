import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(functions.config().gemini.api_key);

/**
 * Improves a product photo using the Gemini 2.5 Flash Image model.
 * This function takes a photo and a prompt, and returns an improved version of the photo.
 */
export const improveProductPhotos = functions.https.onCall(async (data, context) => {
  try {
    const { photo } = data;

    if (!photo || !photo.data || !photo.type) {
      throw new functions.https.HttpsError('invalid-argument', 'Photo data, type are required');
    }

    // Use the Gemini 2.5 Flash Image model (aka "Nano Banana")
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });

    const base64Data = photo.data.split(',')[1];

    // A detailed prompt to guide the model in improving the photo for e-commerce.
    const prompt = `
    Improve this product photo for an e-commerce marketplace.
    Enhance the lighting, remove distracting backgrounds, and make the product look more professional.
    The product should remain the main focus. The final image should be high-resolution and suitable for a product listing.
    The background should be a neutral, clean, and non-distracting, suitable for a product listing on a marketplace like Etsy or Amazon.
    `;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: photo.type,
      },
    };

    // Call the model with the prompt and the image data.
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;

    // Extract the image data from the response.
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new functions.https.HttpsError('internal', 'No response candidates generated');
    }

    const imageParts = candidates[0].content.parts.filter(part => part.inlineData);

    if (imageParts.length === 0) {
      throw new functions.https.HttpsError('internal', 'No image was generated');
    }

    const inlineData = imageParts[0].inlineData;
    if (!inlineData) {
      throw new functions.https.HttpsError('internal', 'No inline data found');
    }

    const improvedPhotoData = inlineData.data;

    // Return the improved photo data.
    return {
      improvedPhoto: {
        data: `data:${photo.type};base64,${improvedPhotoData}`,
        type: photo.type,
      },
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error improving product photo:', error);
    throw new functions.https.HttpsError('internal', 'Failed to improve product photo');
  }
});
