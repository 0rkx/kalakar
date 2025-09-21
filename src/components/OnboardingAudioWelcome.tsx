import React, { useState, useRef } from 'react';
import { Language } from '../types';
import { useAudioRecording } from '../hooks/useAudioRecording';

interface OnboardingAudioWelcomeProps {
  selectedLanguage: Language;
  onContinue: (transcript: string) => void;
  onBack?: () => void;
}

const OnboardingAudioWelcome: React.FC<OnboardingAudioWelcomeProps> = ({
  selectedLanguage,
  onContinue,
  onBack
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [hasRecorded, setHasRecorded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { isRecording, isProcessing, startRecording, stopRecording, processAudio } = useAudioRecording();

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

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
    if (isProcessing) return 'Processing your recording...';
    if (isRecording) return 'Recording... Tap to stop';
    if (hasRecorded) return 'Recording complete!';
    return 'Tap to start recording';
  };

  const handleNext = () => {
    onContinue(transcript);
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-background-main">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          position: absolute;
          right: -12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
          background-clip: content-box;
        }
        .scrollbar-outside {
          margin-right: -12px;
          padding-right: 12px;
        }
      `}</style>
      

      
      <div className="flex-1 overflow-y-auto custom-scrollbar scrollbar-outside" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent'
      }}>
        <div className="px-lg pt-8">
          <div className="flex w-full flex-row items-center justify-center gap-sm pb-lg">
            <div className="h-1.5 w-8 rounded-full bg-border-color"></div>
            <div className="h-1.5 w-8 rounded-full bg-border-color"></div>
            <div className="h-1.5 w-8 rounded-full bg-primary-brand"></div>
          </div>
          
          <div className="space-y-md text-center">
            <h1 className="text-primary-text text-3xl font-bold leading-tight">
              Welcome to Kalakar!
            </h1>
            <p className="text-secondary-text text-base leading-relaxed">
              Listen to the welcome message in {selectedLanguage.nativeName}.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center space-y-lg px-lg py-12 min-h-[400px]">
          {/* Audio Player */}
          <div className="w-full max-w-sm bg-background-light rounded-lg p-lg border border-border-color">
            <div className="flex items-center justify-between mb-md">
              <span className="text-secondary-text text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <button 
                className="text-secondary-text hover:text-primary-text transition-colors"
                onClick={handlePlayPause}
              >
                <span className="material-symbols-outlined text-xl">volume_up</span>
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="relative w-full h-2 bg-border-color rounded-full mb-md">
              <div 
                className="absolute top-0 left-0 h-full bg-primary-brand rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            {/* Play/Pause Button */}
            <div className="flex justify-center">
              <button
                onClick={handlePlayPause}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-brand text-white hover:bg-primary-brand/90 transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
            </div>
          </div>
          
          {/* Message */}
          <div className="text-center space-y-md max-w-md">
            <p className="text-secondary-text text-base leading-relaxed italic">
              "Speak about your craft like you would to a friend. Tell us what you make, how you make it, and why it matters."
            </p>
          </div>

          {/* Recording Section */}
          <div className="w-full max-w-sm">
            <div className="text-center mb-lg">
              <div
                className={`w-24 h-24 mx-auto bg-primary-brand rounded-full flex items-center justify-center mb-md cursor-pointer transition-all ${
                  isRecording ? 'animate-pulse scale-110' : ''
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                onClick={!isProcessing ? handleMicClick : undefined}
              >
                <span className="material-symbols-outlined text-white text-4xl">
                  {isProcessing ? 'hourglass_empty' : isRecording ? 'stop' : 'mic'}
                </span>
              </div>
              <p className="text-base text-secondary-text">{getRecordingStatus()}</p>
            </div>
            
            {/* Hide transcript from user - they don't need to see what was recorded */}
          </div>
          
          {/* Hidden Audio Element */}
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          >
            <source 
              src={selectedLanguage.code === 'en' ? "/voicenote_english.mp3" : "/audio/welcome-message.mp3"} 
              type="audio/mpeg" 
            />
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
      
      <div className="flex-shrink-0 bg-background-main/80 backdrop-blur-sm border-t border-border-color">
        <div className="p-md pb-lg">
          <button 
            className={`btn-primary ${
              !hasRecorded ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={!hasRecorded}
            onClick={handleNext}
          >
            <span className="material-symbols-outlined text-xl mr-2">photo_camera</span>
            Add Photos
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingAudioWelcome;