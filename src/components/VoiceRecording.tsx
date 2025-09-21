import React, { useState } from 'react';
import { Language } from '../types';
import { useAudioRecording } from '../hooks/useAudioRecording';

interface VoiceRecordingProps {
  selectedLanguage: Language;
  onBack: () => void;
  onNext: (transcript: string) => void;
}

const VoiceRecording: React.FC<VoiceRecordingProps> = ({
  selectedLanguage,
  onBack,
  onNext
}) => {
  const [transcript, setTranscript] = useState('');
  const [hasRecorded, setHasRecorded] = useState(false);
  const { isRecording, isProcessing, startRecording, stopRecording, processAudio } = useAudioRecording();

  const handleMicClick = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      const transcriptResult = await processAudio(audioBlob, selectedLanguage.code);
      setTranscript(transcriptResult);
      setHasRecorded(true);
    } else {
      const success = await startRecording();
      if (!success) {
        return;
      }
    }
  };

  const getRecordingStatus = () => {
    if (isProcessing) return 'Processing...';
    if (isRecording) return 'Recording... Tap to stop';
    if (hasRecorded) return 'Recording complete!';
    return 'Tap to start recording';
  };

  const handleNext = () => {
    onNext(transcript);
  };

  return (
    <div className="flex h-full flex-col bg-background-main overflow-hidden">
      <header className="p-md bg-background-light shadow-sm safe-header">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-secondary-text">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-base font-semibold">Describe Your Product</h2>
          <div className="w-6"></div>
        </div>
      </header>
      
      <main className="flex-grow flex flex-col items-center justify-center p-md text-center overflow-y-auto">
        <div className="w-full max-w-sm">
          <p className="text-lg text-gray-600 mb-8 max-w-md">
            "Speak about your craft like you would to a friend. Tell us what you make, how you make it, and why it matters."
          </p>
          <div className="mb-lg">
            <div
              className={`w-28 h-28 mx-auto bg-primary-brand rounded-full flex items-center justify-center mb-md cursor-pointer ${
                isRecording ? 'animate-pulse' : ''
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={!isProcessing ? handleMicClick : undefined}
            >
              <span className="material-symbols-outlined text-white text-5xl">
                {isProcessing ? 'hourglass_empty' : 'mic'}
              </span>
            </div>
            <p className="text-base text-secondary-text">{getRecordingStatus()}</p>
          </div>
          
          {transcript && (
            <div className="bg-background-light rounded-lg p-md shadow-sm ring-1 ring-inset ring-border-color mb-md">
              <h3 className="text-sm font-semibold text-secondary-text mb-sm">Transcript:</h3>
              <p className="text-primary-text text-sm">{transcript}</p>
            </div>
          )}
        </div>
      </main>
      
      <footer className="p-md pb-lg">
        <button 
          className={`btn-primary ${
            !hasRecorded ? 'hidden' : ''
          }`}
          onClick={handleNext}
        >
          <span className="material-symbols-outlined text-xl">photo_camera</span>
          Add Photos
        </button>
      </footer>
    </div>
  );
};

export default VoiceRecording;