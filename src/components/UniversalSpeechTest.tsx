import React, { useState } from 'react';
import { universalSpeechRecognition } from '../services/universalSpeechRecognition';

const UniversalSpeechTest: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState(5);

  const handleRecord = async () => {
    if (isRecording) {
      universalSpeechRecognition.stop();
      setIsRecording(false);
      return;
    }

    if (!universalSpeechRecognition.isSupported()) {
      setError('Audio recording not supported in this browser');
      return;
    }

    setIsRecording(true);
    setError('');
    setResult('');

    try {
      // Request microphone permission first
      console.log('🔐 Requesting microphone permission...');
      const permissionResult = await universalSpeechRecognition.requestMicrophonePermission();
      
      if (!permissionResult.granted) {
        setError(permissionResult.error || 'Microphone permission denied');
        setIsRecording(false);
        return;
      }

      console.log('✅ Microphone permission granted, starting recording...');
      
      // Record and transcribe
      const speechResult = await universalSpeechRecognition.recordAndTranscribe(recordingDuration * 1000);
      
      if (speechResult.success) {
        setResult(`Heard: "${speechResult.transcript}" (Confidence: ${Math.round(speechResult.confidence * 100)}%)`);
      } else {
        setError(speechResult.error || 'Failed to recognize speech');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Universal Speech Recognition Test</h2>
      <p className="text-sm text-gray-600 mb-4">
        Works on all modern browsers using audio recording + Gemini AI transcription
      </p>
      
      {/* Recording Duration Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recording Duration: {recordingDuration} seconds
        </label>
        <input
          type="range"
          min="3"
          max="10"
          value={recordingDuration}
          onChange={(e) => setRecordingDuration(Number(e.target.value))}
          className="w-full"
          disabled={isRecording}
        />
      </div>
      
      <button
        onClick={handleRecord}
        disabled={!universalSpeechRecognition.isSupported()}
        className={`w-full py-3 px-4 rounded-lg font-medium ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300'
        }`}
      >
        {isRecording ? `Stop Recording (${recordingDuration}s)` : 'Start Recording'}
      </button>

      {!universalSpeechRecognition.isSupported() && (
        <p className="mt-2 text-red-600 text-sm">
          Audio recording not supported in this browser
        </p>
      )}

      {isRecording && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-800 text-sm">
            🎤 Recording... Say your name clearly ({recordingDuration} seconds)
          </p>
          <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full animate-pulse"
              style={{ width: '100%' }}
            ></div>
          </div>
        </div>
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
        <p className="font-medium">How it works:</p>
        <ul className="list-disc list-inside mt-1">
          <li>Records audio for {recordingDuration} seconds</li>
          <li>Sends audio to Gemini AI for transcription</li>
          <li>Extracts your name from the speech</li>
          <li>Works on Chrome, Firefox, Safari, Edge</li>
        </ul>
      </div>
    </div>
  );
};

export default UniversalSpeechTest;