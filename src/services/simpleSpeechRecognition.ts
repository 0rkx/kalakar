// Simple speech recognition service using browser's Web Speech API
// This is more reliable than external APIs for basic name recognition

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  success: boolean;
  error?: string;
}

export class SimpleSpeechRecognition {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    // Check if speech recognition is supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  async listenForName(): Promise<SpeechRecognitionResult> {
    // First, explicitly request microphone permission
    try {
      console.log('🎤 Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      return {
        transcript: '',
        confidence: 0,
        success: false,
        error: 'Microphone permission is required. Please allow microphone access and try again.'
      };
    }

    return new Promise((resolve) => {
      if (!this.recognition) {
        resolve({
          transcript: '',
          confidence: 0,
          success: false,
          error: 'Speech recognition not supported in this browser'
        });
        return;
      }

      if (this.isListening) {
        resolve({
          transcript: '',
          confidence: 0,
          success: false,
          error: 'Already listening'
        });
        return;
      }

      let hasResult = false;
      this.isListening = true;

      this.recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
      };

      this.recognition.onresult = (event: any) => {
        hasResult = true;
        this.isListening = false;
        
        const result = event.results[0];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        
        console.log('🗣️ Speech result:', transcript, 'Confidence:', confidence);
        
        // Extract name from common patterns
        const extractedName = this.extractNameFromSpeech(transcript);
        
        resolve({
          transcript: extractedName || transcript,
          confidence: confidence || 0.9,
          success: true
        });
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        if (!hasResult) {
          console.error('🚫 Speech recognition error:', event.error);
          resolve({
            transcript: '',
            confidence: 0,
            success: false,
            error: `Speech recognition error: ${event.error}`
          });
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (!hasResult) {
          resolve({
            transcript: '',
            confidence: 0,
            success: false,
            error: 'No speech detected'
          });
        }
      };

      // Set timeout to prevent hanging
      setTimeout(() => {
        if (this.isListening && !hasResult) {
          this.stop();
          resolve({
            transcript: '',
            confidence: 0,
            success: false,
            error: 'Speech recognition timeout'
          });
        }
      }, 10000); // 10 second timeout

      try {
        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        resolve({
          transcript: '',
          confidence: 0,
          success: false,
          error: `Failed to start speech recognition: ${error.message}`
        });
      }
    });
  }

  private extractNameFromSpeech(transcript: string): string {
    const text = transcript.toLowerCase().trim();
    
    // Common patterns for name introduction
    const patterns = [
      /(?:my name is|i am|i'm|this is|call me)\s+([a-zA-Z\s]+?)(?:\s|$)/i,
      /^([a-zA-Z]+)(?:\s[a-zA-Z]+)?$/i, // Just a name or two names
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Clean up common words that might be captured
        const cleanedName = name
          .replace(/\b(please|thank you|thanks|sir|madam|hello|hi|hey)\b/gi, '')
          .trim();
        
        if (cleanedName && cleanedName.length > 0 && cleanedName.length < 30) {
          // Capitalize first letter of each word
          return cleanedName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }
    }

    // If no pattern matches, try to extract the first reasonable word(s)
    const words = text.split(' ').filter(word => 
      word.length > 1 && 
      !['my', 'name', 'is', 'am', 'this', 'call', 'me', 'hello', 'hi', 'hey'].includes(word)
    );

    if (words.length > 0) {
      const name = words.slice(0, 2).join(' '); // Take first 1-2 words
      return name.charAt(0).toUpperCase() + name.slice(1);
    }

    return transcript.trim();
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  // Check microphone permission status
  async checkMicrophonePermission(): Promise<{ granted: boolean; error?: string }> {
    try {
      // Try to get microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return { granted: true };
    } catch (error) {
      console.error('Microphone permission check failed:', error);
      return { 
        granted: false, 
        error: error.name === 'NotAllowedError' 
          ? 'Microphone access denied. Please allow microphone access in your browser settings.'
          : 'Microphone not available. Please check your microphone connection.'
      };
    }
  }

  // Request microphone permission explicitly
  async requestMicrophonePermission(): Promise<{ granted: boolean; error?: string }> {
    try {
      console.log('🎤 Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('✅ Microphone permission granted');
      stream.getTracks().forEach(track => track.stop());
      return { granted: true };
    } catch (error) {
      console.error('❌ Microphone permission request failed:', error);
      let errorMessage = 'Failed to access microphone';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please click the microphone icon in your browser\'s address bar and allow access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application. Please close other apps using the microphone.';
      }
      
      return { granted: false, error: errorMessage };
    }
  }
}

export const simpleSpeechRecognition = new SimpleSpeechRecognition();