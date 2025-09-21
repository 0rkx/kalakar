import React, { useState } from 'react';
import { universalSpeechRecognition } from '../services/universalSpeechRecognition';

const VoiceTest: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(universalSpeechRecognition.isSupported());

  const handleVoiceTest = async () => {
    if (!isSupported) {
      setError('Voice recognition not supported in this browser');
      return;
    }

    try {
      setError('');
      setIsRecording(true);

      // Request microphone permission
      const permission = await universalSpeechRecognition.requestMicrophonePermission();
      if (!permission.granted) {
        setError(permission.error || 'Microphone permission denied');
        setIsRecording(false);
        return;
      }

      // Record for 5 seconds
      const result = await universalSpeechRecognition.recordAndTranscribe(5000);
      
      if (result.success) {
        setTranscript(result.transcript);
      } else {
        setError(result.error || 'Voice recognition failed');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Voice Recognition Test</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Browser Support: {isSupported ? '✅ Supported' : '❌ Not Supported'}
        </p>
      </div>

      <button
        onClick={handleVoiceTest}
        disabled={!isSupported || isRecording}
        className={`w-full py-3 px-4 rounded-lg font-medium ${
          isRecording
            ? 'bg-red-500 text-white'
            : isSupported
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isRecording ? '🎤 Recording... (5s)' : '🎤 Test Voice Recognition'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {transcript && (
        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
          <p className="text-green-700 text-sm font-medium">Transcript:</p>
          <p className="text-green-800">{transcript}</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>• Make sure you're using HTTPS or localhost</p>
        <p>• Allow microphone permissions when prompted</p>
        <p>• Speak clearly for 5 seconds after clicking the button</p>
        <p>• Ensure the backend server is running on port 3001</p>
      </div>
    </div>
  );
};

export default VoiceTest;