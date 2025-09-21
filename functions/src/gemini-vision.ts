import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(functions.config().gemini.api_key);

export const analyzeProductPhotos = functions.https.onCall(async (data, context) => {
  try {
    const { photos, conversationContext } = data;
    
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Photos array is required');
    }

    // Use Gemini Nano Banana (Vision model) for photo analysis
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-vision-latest" });
    
    const analysisPromises = photos.map(async (photo: any, index: number) => {
      const base64Data = photo.data.split(',')[1];
      
      // Build context-aware prompt using conversation data
      let contextualInfo = '';
      if (conversationContext && conversationContext.extractedInfo) {
        const info = conversationContext.extractedInfo;
        contextualInfo = `
        CONVERSATION CONTEXT:
        - Product Type: ${info.productType || 'Not specified'}
        - Materials: ${info.materials ? info.materials.join(', ') : 'Not specified'}
        - Colors: ${info.colors ? info.colors.join(', ') : 'Not specified'}
        - Crafting Process: ${info.craftingProcess || 'Not specified'}
        - Cultural Significance: ${info.culturalSignificance || 'Not specified'}
        - Unique Features: ${info.uniqueFeatures ? info.uniqueFeatures.join(', ') : 'Not specified'}
        `;
      }

      const prompt = `
      Analyze this handmade product photo from an Indian artisan. 
      ${contextualInfo}
      
      Use the conversation context above to provide more accurate analysis. Verify and enhance the information based on what you see in the photo.
      
      Provide detailed analysis including:
      
      1. Product Category: What type of product is this? (verify against conversation context)
      2. Materials: What materials appear to be used? (compare with stated materials)
      3. Craftsmanship: Describe the quality and technique visible
      4. Colors: List the main colors present (verify against stated colors)
      5. Style/Design: Describe the artistic style and design elements
      6. Cultural Elements: Any traditional Indian art forms or cultural motifs
      7. Condition: Assess the product condition and quality
      8. Marketability: Rate the commercial appeal (1-10)
      9. Suggested Tags: Provide relevant marketplace tags
      10. Photo Quality: Rate the photo quality for marketplace use (1-10)
      11. Context Verification: How well does the photo match the conversation details?
      
      Format as JSON for easy parsing.
      `;

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: photo.type,
            data: base64Data
          }
        },
        prompt
      ]);

      const response = await result.response;
      const analysisText = response.text();
      
      try {
        // Try to parse as JSON, fallback to structured text
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
          rawAnalysis: analysisText,
          photoIndex: index
        };
        
        return {
          photoIndex: index,
          photoName: photo.name,
          analysis: analysis,
          processedAt: new Date().toISOString()
        };
      } catch (parseError) {
        return {
          photoIndex: index,
          photoName: photo.name,
          analysis: { rawAnalysis: analysisText },
          processedAt: new Date().toISOString()
        };
      }
    });

    const photoAnalyses = await Promise.all(analysisPromises);

    // Generate overall product summary with conversation context
    let conversationSummary = '';
    if (conversationContext) {
      conversationSummary = `
      CONVERSATION SUMMARY:
      - Language: ${conversationContext.language?.name || 'Not specified'}
      - Total Conversation Turns: ${conversationContext.turns?.length || 0}
      - Conversation Status: ${conversationContext.status || 'Unknown'}
      - Extracted Product Info: ${JSON.stringify(conversationContext.extractedInfo || {})}
      `;
    }

    const summaryPrompt = `
    Based on the analysis of ${photos.length} product photos and conversation context, create a comprehensive product summary:
    
    ${conversationSummary}
    
    PHOTO ANALYSES:
    ${photoAnalyses.map(pa => `Photo ${pa.photoIndex + 1}: ${JSON.stringify(pa.analysis)}`).join('\n')}
    
    Provide:
    1. Overall Product Category (reconcile photo analysis with conversation)
    2. Primary Materials (verify conversation details against photos)
    3. Artistic Style (enhanced by conversation context)
    4. Quality Assessment (based on photos and conversation details)
    5. Market Positioning (informed by conversation insights)
    6. Recommended Price Range (in USD and INR, consider conversation pricing info)
    7. Target Audience (enhanced by conversation context)
    8. Best Marketing Platforms
    9. Conversation-Photo Consistency Score (1-10)
    10. Enhanced Product Story (combining conversation and visual analysis)
    
    Format as JSON.
    `;

    const summaryResult = await model.generateContent(summaryPrompt);
    const summaryResponse = await summaryResult.response;
    const summaryText = summaryResponse.text();
    
    let overallSummary;
    try {
      const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
      overallSummary = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawSummary: summaryText };
    } catch (parseError) {
      overallSummary = { rawSummary: summaryText };
    }

    return {
      photoAnalyses,
      overallSummary,
      totalPhotos: photos.length,
      conversationContextUsed: !!conversationContext,
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error analyzing product photos:', error);
    throw new functions.https.HttpsError('internal', 'Failed to analyze product photos');
  }
});