// Voice recording service for capturing audio input
export class VoiceRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      // Store the stream for later use
      this.stream = stream;
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  async startRecording(): Promise<void> {
    if (!this.stream) {
      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) {
        throw new Error('Microphone permission required');
      }
    }

    this.audioChunks = [];
    
    this.mediaRecorder = new MediaRecorder(this.stream!, {
      mimeType: 'audio/webm;codecs=opus'
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
          console.log('Original audio blob size:', audioBlob.size, 'bytes');
          
          // Convert to WAV format for better compatibility with Gemini
          const wavBlob = await this.convertToWav(audioBlob);
          console.log('Converted WAV blob size:', wavBlob.size, 'bytes');
          
          resolve(wavBlob);
        } catch (error) {
          console.error('Error converting audio:', error);
          // Fallback to original blob if conversion fails
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
          resolve(audioBlob);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  // Convert audio blob to WAV format
  private async convertToWav(audioBlob: Blob): Promise<Blob> {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV
      const wavBuffer = this.audioBufferToWav(audioBuffer);
      return new Blob([wavBuffer], { type: 'audio/wav' });
    } catch (error) {
      console.warn('Audio conversion failed, using original format:', error);
      return audioBlob;
    }
  }

  // Convert AudioBuffer to WAV format
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  // Convert audio blob to base64 for API transmission
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Convert audio to text using Web Speech API as fallback
  async speechToText(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      // For this implementation, we'll use the live audio stream
      // In a real implementation, you'd need to play the audio blob
      recognition.start();
    });
  }
}

export const voiceRecordingService = new VoiceRecordingService();