// Universal speech recognition that works on any browser
// Simplified for preset audio playback without transcription

export interface UniversalSpeechResult {
  transcript: string;
  confidence: number;
  success: boolean;
  error?: string;
}

export class UniversalSpeechRecognition {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;

  // Check if audio recording is supported (works in all modern browsers)
  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  // Request microphone permission
  async requestMicrophonePermission(): Promise<{ granted: boolean; error?: string }> {
    try {
      console.log('🎤 Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      console.log('✅ Microphone permission granted');

      // Keep the stream for recording
      this.stream = stream;
      return { granted: true };
    } catch (error) {
      console.error('❌ Microphone permission request failed:', error);
      let errorMessage = 'Failed to access microphone';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application.';
      }

      return { granted: false, error: errorMessage };
    }
  }

  // Start recording audio
  async startRecording(): Promise<void> {
    if (!this.stream) {
      throw new Error('No audio stream available. Request permission first.');
    }

    this.audioChunks = [];

    // Use a compatible MIME type that works across browsers
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Let browser choose
        }
      }
    }

    console.log('🎙️ Using MIME type:', mimeType || 'browser default');

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: mimeType || undefined
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        console.log('📊 Audio chunk received:', event.data.size, 'bytes');
      }
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
    this.isRecording = true;
    console.log('🔴 Recording started');
  }

  // Stop recording and get audio blob
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm'
        });
        console.log('🎵 Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);
        this.isRecording = false;
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  // Convert audio blob to base64 for API transmission
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Simplified method for preset audio interaction (no transcription needed)
  async recordForPresetResponse(durationMs: number = 3000): Promise<UniversalSpeechResult> {
    try {
      // Start recording
      await this.startRecording();

      // Record for specified duration
      console.log(`⏱️ Recording user response for ${durationMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, durationMs));

      // Stop recording
      const audioBlob = await this.stopRecording();

      if (audioBlob.size === 0) {
        return {
          transcript: '',
          confidence: 0,
          success: false,
          error: 'No audio recorded. Please speak louder or check your microphone.'
        };
      }

      // Return success without transcription (preset audio will guide user)
      return {
        transcript: 'User response recorded', // Generic response
        confidence: 1.0,
        success: true
      };

    } catch (error) {
      console.error('💥 Error in recording:', error);
      return {
        transcript: '',
        confidence: 0,
        success: false,
        error: `Recording failed: ${error.message}`
      };
    }
  }

  // Play preset audio instructions to guide user
  async playPresetAudio(audioType: 'welcome' | 'name_prompt' | 'product_prompt' | 'thank_you'): Promise<void> {
    try {
      console.log(`🔊 Playing preset audio: ${audioType}`);
      
      // In a real implementation, you would have actual audio files
      // For now, we'll simulate audio playback
      const audioMessages = {
        welcome: 'Welcome! I will guide you through creating your product listing.',
        name_prompt: 'Please tell me your name.',
        product_prompt: 'Now, please describe your product.',
        thank_you: 'Thank you! Processing your information.'
      };

      // Simulate audio playback
      console.log(`🎵 Audio message: ${audioMessages[audioType]}`);
      
      // In a real app, you would play actual audio files here
      // await this.playAudioFile(`/audio/${audioType}.mp3`);
      
    } catch (error) {
      console.error('❌ Error playing preset audio:', error);
    }
  }

  // Extract name from transcript - optimized for unique names like "Rydam"
  private extractNameFromTranscript(transcript: string): string {
    const originalText = transcript.trim();
    const lowerText = transcript.toLowerCase().trim();

    // First, check if it's already just a name (preserve original case for unique names)
    if (/^[a-zA-Z]+(?:\s[a-zA-Z]+)?$/.test(originalText) &&
      !['unclear', 'no speech', 'audio', 'hello', 'hi', 'hey'].includes(lowerText)) {
      return this.capitalizeProperName(originalText);
    }

    // Common patterns for name introduction (use original text to preserve unique spellings)
    const patterns = [
      /(?:my name is|i am|i'm|this is|call me)\s+([a-zA-Z\s]+?)(?:\s|$)/i,
      /^([a-zA-Z]+)(?:\s[a-zA-Z]+)?$/i, // Just a name or two names
    ];

    for (const pattern of patterns) {
      const match = originalText.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Clean up common words but preserve unique names
        const cleanedName = name
          .replace(/\b(please|thank you|thanks|sir|madam|hello|hi|hey|unclear|audio|no|speech)\b/gi, '')
          .trim();

        if (cleanedName && cleanedName.length > 0 && cleanedName.length < 30) {
          return this.capitalizeProperName(cleanedName);
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
      return this.capitalizeProperName(name);
    }

    return originalText;
  }

  // Helper function to properly capitalize names while preserving unique spellings
  private capitalizeProperName(name: string): string {
    return name
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        // Preserve the original spelling but ensure first letter is capitalized
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  // Check if currently recording
  getIsRecording(): boolean {
    return this.isRecording;
  }

  // Stop recording if in progress
  stop(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  // Cleanup resources
  cleanup(): void {
    this.stop();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

export const universalSpeechRecognition = new UniversalSpeechRecognition();