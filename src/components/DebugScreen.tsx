import React from 'react';

interface DebugScreenProps {
  onTestDashboard?: () => void;
  onTestBackend?: () => void;
}

const DebugScreen: React.FC<DebugScreenProps> = ({ onTestDashboard, onTestBackend }) => {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <h1 className="text-3xl font-bold text-green-600 mb-4">✅ React is Working!</h1>
        <p className="text-gray-600 mb-4">
          If you can see this screen, React is rendering correctly.
        </p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>Current time: {new Date().toLocaleTimeString()}</p>
          <p>Environment: {process.env.NODE_ENV || 'development'}</p>
        </div>
        <div className="mt-6 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">Next Steps:</h3>
          <ol className="text-left text-sm text-blue-700 space-y-1">
            <li>1. Check browser console for errors</li>
            <li>2. Verify backend is running on port 3001</li>
            <li>3. Test backend connection</li>
          </ol>
        </div>
        <div className="mt-4 space-y-2">
          {onTestDashboard && (
            <button 
              onClick={onTestDashboard}
              className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
            >
              Test Real Dashboard
            </button>
          )}
          {onTestBackend && (
            <button 
              onClick={onTestBackend}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Test Backend Connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugScreen;