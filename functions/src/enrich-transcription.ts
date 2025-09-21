import * as functions from 'firebase-functions';
import { GeminiAIService } from './services/gemini-ai-service';
import { db } from './firebase-config';

interface EnrichTranscriptionRequest {
    transcription: string;
    userId: string;
}

export const enrichTranscription = functions.https.onCall(async (data: EnrichTranscriptionRequest, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { transcription, userId } = data;

    if (!transcription || !userId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "transcription" and "userId".');
    }

    const prompt = `
        You are an expert in helping artisans tell their story and sell their products.
        Based on the following transcription of an artisan talking about their craft, please create a structured knowledge base in JSON format.

        Transcription:
        "${transcription}"

        Please extract and generate the following information:
        1.  "craftStory": A compelling and authentic story about the artisan's craft, their inspiration, and their process. Write it in a warm, personal tone.
        2.  "productDescriptions": A list of 3-5 product descriptions. Each description should be engaging and highlight the unique features of the products mentioned. Each description should have a "title" and a "description" field.
        3.  "keywords": A list of 15-20 relevant keywords for SEO and marketplace listings. Include keywords related to the craft, materials, techniques, style, and potential uses.

        The output must be a valid JSON object with the keys "craftStory", "productDescriptions", and "keywords".
    `;

    try {
        const resultText = await GeminiAIService.generateText(prompt);
        const resultJson = JSON.parse(resultText);

        await db.collection('craftKnowledgeBase').doc(userId).set(resultJson);

        return { success: true, knowledgeBase: resultJson };
    } catch (error) {
        console.error('Error enriching transcription:', error);
        throw new functions.https.HttpsError('internal', 'Failed to enrich transcription.', error);
    }
});
