import { useState, useRef, useCallback } from 'react';
import { processVoiceDescription } from '../services/api';

export const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access to record your product description.');
      return false;
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(new Blob());
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setIsRecording(false);
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
      
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    });
  }, [isRecording]);

  const processAudio = useCallback(async (audioBlob: Blob, languageCode: string): Promise<string> => {
    setIsProcessing(true);
    try {
      const transcript = await processVoiceDescription(audioBlob, languageCode);
      return transcript;
    } catch (error) {
      console.error('Error processing audio:', error);
      // You might want to show a user-friendly error message here
      alert('There was an error processing your voice description. Please try again.');
      return ''; // Return empty string or handle error as needed
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    processAudio
  };
};