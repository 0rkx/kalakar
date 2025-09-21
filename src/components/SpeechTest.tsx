import React, { useState } from 'react';
import { simpleSpeechRecognition } from '../services/simpleSpeechRecognition';

const SpeechTest: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleListen = async () => {
    if (isListening) {
      simpleSpeechRecognition.stop();
      setIsListening(false);
      return;
    }

    if (!simpleSpeechRecognition.isSupported()) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    setIsListening(true);
    setError('');
    setResult('');

    try {
      // First request microphone permission explicitly
      console.log('🔐 Requesting microphone permission...');
      const permissionResult = await simpleSpeechRecognition.requestMicrophonePermission();
      
      if (!permissionResult.granted) {
        setError(permissionResult.error || 'Microphone permission denied');
        setIsListening(false);
        return;
      }

      console.log('✅ Microphone permission granted, starting speech recognition...');
      const speechResult = await simpleSpeechRecognition.listenForName();
      
      if (speechResult.success) {
        setResult(`Heard: "${speechResult.transcript}" (Confidence: ${Math.round(speechResult.confidence * 100)}%)`);
      } else {
        setError(speechResult.error || 'Failed to recognize speech');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsListening(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Speech Recognition Test</h2>
      
      <button
        onClick={handleListen}
        disabled={!simpleSpeechRecognition.isSupported()}
        className={`w-full py-3 px-4 rounded-lg font-medium ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300'
        }`}
      >
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </button>

      {!simpleSpeechRecognition.isSupported() && (
        <p className="mt-2 text-red-600 text-sm">
          Speech recognition not supported in this browser
        </p>
      )}

      {isListening && (
        <p className="mt-2 text-blue-600 text-sm">
          🎤 Listening... Say your name clearly
        </p>
      )}

      {result && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 text-sm">{result}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>Instructions:</p>
        <ul className="list-disc list-inside">
          <li>Click "Start Listening"</li>
          <li>Say your name clearly</li>
          <li>Wait for the result</li>
        </ul>
      </div>
    </div>
  );
};

export default SpeechTest;