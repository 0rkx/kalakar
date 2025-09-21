import * as functions from 'firebase-functions';
import { GeminiAIService } from './services/gemini-ai-service';
import { db } from './firebase-config';

interface GenerateSocialContentRequest {
    userId: string;
}

export const generateSocialContent = functions.https.onCall(async (data: GenerateSocialContentRequest, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { userId } = data;

    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "userId".');
    }

    try {
        const knowledgeBaseDoc = await db.collection('craftKnowledgeBase').doc(userId).get();
        if (!knowledgeBaseDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Knowledge base not found for this user.');
        }

        const knowledgeBase = knowledgeBaseDoc.data();

        const prompt = `
            You are a social media marketing expert for artisans.
            Based on the following knowledge base about an artisan's craft, generate a set of social media content to help them promote their products.

            Knowledge Base:
            ${JSON.stringify(knowledgeBase, null, 2)}

            Please generate the following content in a valid JSON format:
            1.  "socialPosts": A list of 3-5 short, engaging social media posts for platforms like Instagram and Facebook. Each post should be around 2-3 sentences and include relevant hashtags.
            2.  "shortAds": A list of 2-3 short ad copies (1-2 sentences) that can be used for paid social media campaigns.
            3.  "storySnippets": A list of 3-5 story snippets that can be used for Instagram or Facebook Stories. These can be short questions, behind-the-scenes glimpses, or calls to action.

            The output must be a valid JSON object with the keys "socialPosts", "shortAds", and "storySnippets".
        `;

        const resultText = await GeminiAIService.generateText(prompt);
        const resultJson = JSON.parse(resultText);

        return { success: true, socialContent: resultJson };
    } catch (error) {
        console.error('Error generating social content:', error);
        throw new functions.https.HttpsError('internal', 'Failed to generate social content.', error);
    }
});
