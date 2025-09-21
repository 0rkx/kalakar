import React, { useEffect, useRef } from 'react';
import { Language } from '../types';

interface VoiceWelcomeProps {
  selectedLanguage: Language;
  onContinue: () => void;
  onBack: () => void;
}

const audioMessages: Record<Language['code'], string> = {
    'en': '/audio/welcome_en.mp3',
    'hi': '/audio/welcome_hi.mp3',
    'bn': '/audio/welcome_bn.mp3',
    'ta': '/audio/welcome_ta.mp3',
    'gu': '/audio/welcome_gu.mp3',
    'mr': '/audio/welcome_mr.mp3',
};

const VoiceWelcome: React.FC<VoiceWelcomeProps> = ({ selectedLanguage, onContinue, onBack }) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.play().catch(error => {
                console.error("Audio play failed:", error);
            });
        }
    }, [selectedLanguage]);

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-4 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Kalakar!</h1>
            <p className="text-lg text-gray-600 mb-8">Listen to the welcome message in {selectedLanguage.name}.</p>

            <div className="mb-8">
                <audio ref={audioRef} src={audioMessages[selectedLanguage.code]} controls />
            </div>

            <p className="text-md text-gray-600 mb-8 max-w-md">
                "Speak about your craft like you would to a friend. Tell us what you make, how you make it, and why it matters."
            </p>

            <button
                onClick={onContinue}
                className="w-full max-w-xs bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300"
            >
                Continue
            </button>
            <button
                onClick={onBack}
                className="mt-4 w-full max-w-xs bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors duration-300"
            >
                Back
            </button>
        </div>
    );
};

export default VoiceWelcome;
