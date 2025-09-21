import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const getGeminiApiKey = (): string => {
  return process.env.GEMINI_API_KEY || functions.config().gemini?.api_key || '';
};

const genAI = new GoogleGenerativeAI(getGeminiApiKey());

// Audio transcription response interface
interface AudioTranscriptionResponse {
  transcript: string;
  confidence: number;
  processingTime: number;
  success: boolean;
  error?: string;
}

/**
 * Simple audio transcription using Gemini AI for onboarding and basic use cases
 * Does not require authentication or conversation tracking
 */
export const transcribeAudio = functions.https.onCall(async (data, context) => {
  const startTime = Date.now();
  
  try {
    console.log('🎤 Audio transcription function called');
    console.log('📊 Input data keys:', Object.keys(data));
    
    const { audioData, purpose = 'general' } = data;
    
    // Check API key first
    const apiKey = getGeminiApiKey();
    console.log('🔑 API key status:', apiKey ? `configured (${apiKey.substring(0, 10)}...)` : 'missing');
    
    if (!apiKey) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Gemini API key not configured'
      );
    }
    
    // Validate input parameters
    if (!audioData) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Audio data is required'
      );
    }

    // Extract base64 audio data (remove data URL prefix if present)
    let base64Audio = audioData;
    if (typeof audioData === 'string' && audioData.includes(',')) {
      base64Audio = audioData.split(',')[1];
    }
    
    if (!base64Audio || base64Audio.length < 100) {
      console.error('❌ Invalid or too small audio data:', base64Audio?.length || 0);
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid or insufficient audio data'
      );
    }

    console.log('✅ Audio data validated, size:', base64Audio.length, 'characters');

    // Process audio with Gemini AI
    console.log('🤖 Initializing Gemini model...');
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1, // Lower temperature for more consistent transcription
        topP: 0.8,
        topK: 20,
        maxOutputTokens: 100, // Limit output for name extraction
      }
    });
    console.log('📝 Audio data length:', base64Audio.length, 'characters');
    console.log('🎯 Purpose:', purpose);
    
    let prompt = '';
    
    if (purpose === 'name') {
      prompt = `
      You are a specialized name transcription AI. Your job is to transcribe names EXACTLY as spoken, especially unique or uncommon names.

      CRITICAL INSTRUCTIONS:
      - This person is saying their name for registration
      - Transcribe the EXACT phonetic sounds you hear
      - DO NOT "correct" unique names to common ones
      - DO NOT assume common spellings for unique sounds
      - Pay special attention to unique names like "Rydam", "Kiran", "Zara", "Aadhya", etc.
      - If you hear "RY-dam", write "Rydam" (not "Adam", "Ryan", or "Ryder")
      - If you hear "KEE-ran", write "Kiran" (not "Karen" or "Kieran")
      - Focus on phonetic accuracy, not dictionary words
      - Preserve unusual pronunciations and spellings

      EXAMPLES:
      - Audio: "My name is Rydam" → {"name": "Rydam"}
      - Audio: "I'm Zara" → {"name": "Zara"}
      - Audio: "Call me Kiran" → {"name": "Kiran"}
      - Audio: "This is Aadhya" → {"name": "Aadhya"}
      - Audio: mumbled sounds → {"name": "unclear"}
      - Audio: no speech → {"name": "no speech"}

      Listen carefully and transcribe the name EXACTLY as pronounced.
      Return only: {"name": "extracted_name"}
      `;
    } else {
      prompt = `
      Transcribe this audio accurately.
      Return only: {"transcript": "what_was_said"}
      `;
    }

    console.log('🚀 Sending audio to Gemini for transcription...');
    
    // Determine MIME type based on audio data characteristics
    let mimeType = "audio/webm";
    
    // Try to detect audio format from data
    try {
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      const header = audioBuffer.toString('hex', 0, 8);
      
      if (header.startsWith('52494646')) { // RIFF header (WAV)
        mimeType = "audio/wav";
      } else if (header.startsWith('1a45dfa3')) { // WebM header
        mimeType = "audio/webm";
      } else if (header.startsWith('000001')) { // MP4 header
        mimeType = "audio/mp4";
      }
      
      console.log('🎵 Detected audio format:', mimeType, 'Header:', header);
    } catch (error) {
      console.warn('⚠️ Could not detect audio format, using default:', mimeType);
    }
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Audio
        }
      },
      prompt
    ]);
    console.log('✅ Received response from Gemini');
    console.log('📄 Raw response:', result.response.text().substring(0, 200) + '...');

    const response = result.response;
    const responseText = response.text();
    
    // Parse Gemini response
    let parsedResponse;
    let extractedName = '';
    let transcript = '';
    
    try {
      // Extract JSON from response (handle cases where Gemini adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
        
        if (purpose === 'name') {
          // For name extraction, look for the "name" field
          extractedName = parsedResponse.name || parsedResponse.extracted_name || '';
          transcript = extractedName || parsedResponse.transcript || '';
        } else {
          transcript = parsedResponse.transcript || '';
        }
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('Failed to parse Gemini JSON response, using fallback parsing');
      // Fallback: use the entire response as transcript
      transcript = responseText.trim();
      
      if (purpose === 'name') {
        // Try to extract name from plain text response
        extractedName = extractNameFromText(transcript);
        transcript = extractedName || transcript;
      }
    }

    const processingTime = Date.now() - startTime;
    
    // Prepare response
    const transcriptionResponse: AudioTranscriptionResponse = {
      transcript: transcript || '',
      confidence: parsedResponse?.confidence || 0.8,
      processingTime,
      success: true
    };

    // Add extracted name if this was for name purpose
    if (purpose === 'name' && extractedName) {
      (transcriptionResponse as any).extractedName = extractedName;
    }

    console.log(`Audio transcribed successfully. Processing time: ${processingTime}ms, Confidence: ${transcriptionResponse.confidence}`);

    return transcriptionResponse;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Error transcribing audio:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Check API key availability
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.error('Gemini API key is not configured');
      const errorResponse: AudioTranscriptionResponse = {
        transcript: '',
        confidence: 0,
        processingTime,
        success: false,
        error: 'Gemini API key not configured'
      };
      return errorResponse;
    }
    
    // Determine error type and message
    let errorMessage = 'Failed to transcribe audio';
    
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HttpsError as-is
    }
    
    if (error instanceof Error) {
      // Log the actual error message for debugging
      console.error('Actual error message:', error.message);
      
      if (error.message.includes('API key') || error.message.includes('API_KEY')) {
        errorMessage = 'Gemini API key not configured properly';
      } else if (error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('RATE_LIMIT') || error.message.includes('Too Many Requests') || error.message.includes('429')) {
        errorMessage = 'Gemini API quota exceeded. Please wait a few minutes or upgrade your plan.';
      } else if (error.message.includes('Bad Request') || error.message.includes('400')) {
        errorMessage = 'Invalid audio format. Please try recording again.';
      } else if (error.message.includes('audio') || error.message.includes('format')) {
        errorMessage = 'Invalid audio format or corrupted audio data';
      } else if (error.message.includes('permission') || error.message.includes('PERMISSION')) {
        errorMessage = 'Gemini API permission denied';
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        // Include the actual error message for debugging
        errorMessage = `Transcription failed: ${error.message}`;
      }
    }

    // Return error response instead of throwing for better client handling
    const errorResponse: AudioTranscriptionResponse = {
      transcript: '',
      confidence: 0,
      processingTime,
      success: false,
      error: errorMessage
    };

    return errorResponse;
  }

});

// Helper function to extract name from text - optimized for unique names
function extractNameFromText(text: string): string {
    const originalText = text.trim();
    const cleanText = text.toLowerCase().trim();
    
    // First, check if it's already just a name (preserve original case for unique names)
    if (/^[a-zA-Z]+(?:\s[a-zA-Z]+)?$/.test(originalText) && 
        !['unclear', 'no speech', 'audio', 'hello', 'hi', 'hey'].includes(cleanText)) {
      return capitalizeProperName(originalText);
    }
    
    // Common patterns for name introduction (preserve original case)
    const patterns = [
      /(?:my name is|i am|i'm|this is|call me)\s+([a-zA-Z\s]+?)(?:\s|$)/i,
      /^([a-zA-Z]+)(?:\s[a-zA-Z]+)?$/i, // Just a name or two names
    ];

    for (const pattern of patterns) {
      const match = originalText.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Clean up common words that might be captured (but preserve unique names)
        const cleanedName = name
          .replace(/\b(please|thank you|thanks|sir|madam|hello|hi|hey|unclear|audio|no|speech)\b/gi, '')
          .trim();
        
        if (cleanedName && cleanedName.length > 0 && cleanedName.length < 30) {
          return capitalizeProperName(cleanedName);
        }
      }
    }

    // If no pattern matches, try to extract the first reasonable word(s) from original text
    const words = originalText.split(' ').filter(word => {
      const lowerWord = word.toLowerCase();
      return word.length > 1 && 
        !['my', 'name', 'is', 'am', 'this', 'call', 'me', 'hello', 'hi', 'hey', 'unclear', 'audio', 'no', 'speech'].includes(lowerWord);
    });

    if (words.length > 0) {
      const name = words.slice(0, 2).join(' '); // Take first 1-2 words
      return capitalizeProperName(name);
    }

    return originalText;
}

// Helper function to properly capitalize names while preserving unique spellings
function capitalizeProperName(name: string): string {
  return name
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      // Preserve the original spelling but ensure first letter is capitalized
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}