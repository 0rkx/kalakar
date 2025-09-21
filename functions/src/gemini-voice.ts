import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(functions.config().gemini.api_key);

// Language mapping for Gemini Live (currently unused but kept for future use)
// const LANGUAGE_CODES: { [key: string]: string } = {
//   'en': 'en-US',
//   'hi': 'hi-IN',
//   'bn': 'bn-IN',
//   'ta': 'ta-IN',
//   'gu': 'gu-IN',
//   'mr': 'mr-IN'
// };

export const processVoiceDescription = functions.https.onCall(async (data, context) => {
  try {
    const { audio, language } = data;
    
    if (!audio || !language) {
      throw new functions.https.HttpsError('invalid-argument', 'Audio data and language are required');
    }

    // Extract base64 audio data
    const base64Audio = audio.split(',')[1];
    // const audioBuffer = Buffer.from(base64Audio, 'base64'); // Kept for future use

    // Use Gemini Live for voice processing
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Convert audio to text using Gemini's multimodal capabilities
    const prompt = `
    Transcribe this audio recording of an Indian artisan describing their handmade product. 
    The audio is in ${language} language. 
    Please provide an accurate transcription and also translate it to English if it's not already in English.
    
    Format the response as:
    Original: [transcription in original language]
    English: [English translation]
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "audio/wav",
          data: base64Audio
        }
      },
      prompt
    ]);

    const response = result.response;
    const transcript = response.text();

    // Extract English version for further processing
    const englishMatch = transcript.match(/English: (.+)/);
    const englishTranscript = englishMatch ? englishMatch[1] : transcript;

    return {
      transcript: englishTranscript,
      originalTranscript: transcript,
      language: language,
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error processing voice description:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process voice description');
  }
});