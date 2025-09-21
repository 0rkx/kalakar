import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

interface GeminiLiveResponse {
  response: string;
  session: {
    history: Array<{
      role: 'user' | 'model';
      parts: Array<{ text: string }>;
    }>;
    context?: string;
    stage?: string;
  };
}

interface ConversationSession {
  history: Array<{
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }>;
  context?: string;
  stage?: string;
}

interface AudioTranscriptionResponse {
  transcript: string;
  extractedName?: string;
  confidence: number;
  processingTime: number;
  success: boolean;
  error?: string;
}

export class GeminiLiveClient {
  private geminiLiveFunction = httpsCallable<{
    message: string;
    session?: ConversationSession;
  }, GeminiLiveResponse>(functions, 'geminiLive');

  private transcribeAudioFunction = httpsCallable<{
    audioData: string;
    purpose?: string;
  }, AudioTranscriptionResponse>(functions, 'transcribeAudio');

  async sendMessage(message: string, session?: ConversationSession): Promise<GeminiLiveResponse> {
    try {
      console.log('Sending message to Gemini Live:', message);
      
      const result = await this.geminiLiveFunction({
        message,
        session
      });

      console.log('Received response from Gemini Live:', result.data);
      return result.data;
    } catch (error) {
      console.error('Error calling Gemini Live function:', error);
      throw new Error(`Failed to get response from Gemini Live: ${error.message}`);
    }
  }

  // Transcribe audio using Gemini Live
  async transcribeAudio(audioData: string, purpose: string = 'general'): Promise<AudioTranscriptionResponse> {
    try {
      console.log('Transcribing audio with Gemini Live, purpose:', purpose);
      
      const result = await this.transcribeAudioFunction({
        audioData,
        purpose
      });

      console.log('Received transcription response:', result.data);
      return result.data;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  // Helper method for name extraction from voice input
  async extractNameFromVoice(transcript: string): Promise<string> {
    try {
      const nameExtractionPrompt = `Extract just the person's name from this transcript. The person is introducing themselves. Return only the name, nothing else. If no clear name is found, return "Unknown".

Transcript: "${transcript}"

Name:`;

      const response = await this.sendMessage(nameExtractionPrompt);
      
      // Clean up the response to get just the name
      const extractedName = response.response.trim().replace(/^Name:\s*/, '');
      
      // Basic validation - if it looks like a name, return it
      if (extractedName && extractedName !== 'Unknown' && extractedName.length > 0 && extractedName.length < 50) {
        return extractedName;
      }
      
      return 'Unknown';
    } catch (error) {
      console.error('Error extracting name:', error);
      return 'Unknown';
    }
  }
}

export const geminiLiveClient = new GeminiLiveClient();