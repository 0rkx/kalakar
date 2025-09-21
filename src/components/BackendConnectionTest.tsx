import React, { useState, useEffect } from 'react';
import { backendApi } from '../services/backendApi';

interface BackendConnectionTestProps {
  onBack: () => void;
}

const BackendConnectionTest: React.FC<BackendConnectionTestProps> = ({ onBack }) => {
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setIsLoading(true);
    
    try {
      // Test basic connection
      const connectionResult = await backendApi.testConnection();
      setConnectionStatus(connectionResult);
      
      // Test health endpoint
      const healthResult = await backendApi.checkHealth();
      setHealthStatus(healthResult);
      
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus({
        success: false,
        message: `Test failed: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-background-main">
      <button 
        className="absolute top-4 left-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-background-main/80 backdrop-blur-sm hover:bg-background-light transition-colors shadow-sm"
        onClick={onBack}
      >
        <span className="material-symbols-outlined text-primary-text text-lg">arrow_back</span>
      </button>

      <div className="flex-1 overflow-y-auto p-6 pt-16">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary-text mb-2">
              Backend Connection Test
            </h1>
            <p className="text-secondary-text">
              Testing connection to http://localhost:3001
            </p>
          </div>

          {/* Connection Test */}
          <div className="bg-background-light rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-primary-text">Connection Test</h3>
              <button
                onClick={testConnection}
                disabled={isLoading}
                className="text-sm text-primary-brand hover:underline disabled:opacity-50"
              >
                {isLoading ? 'Testing...' : 'Retry Test'}
              </button>
            </div>
            
            {connectionStatus ? (
              <div className={`p-3 rounded ${connectionStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center mb-2">
                  <span className={`text-sm font-medium ${connectionStatus.success ? 'text-green-800' : 'text-red-800'}`}>
                    {connectionStatus.success ? '✅ Connection Successful' : '❌ Connection Failed'}
                  </span>
                </div>
                <p className={`text-xs ${connectionStatus.success ? 'text-green-700' : 'text-red-700'}`}>
                  {connectionStatus.message}
                </p>
                {connectionStatus.endpoints && (
                  <div className="mt-2">
                    <p className="text-xs text-green-600 font-medium">Available Endpoints:</p>
                    <ul className="text-xs text-green-600 mt-1">
                      {connectionStatus.endpoints.map((endpoint: string, index: number) => (
                        <li key={index}>• {endpoint}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-brand"></div>
                <span className="ml-2 text-secondary-text">Testing connection...</span>
              </div>
            ) : null}
          </div>

          {/* Health Check */}
          <div className="bg-background-light rounded-lg p-4">
            <h3 className="font-semibold text-primary-text mb-3">Service Health</h3>
            
            {healthStatus ? (
              <div className="space-y-2">
                <div className={`p-2 rounded text-sm ${healthStatus.status === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  Status: {healthStatus.status === 'ok' ? 'Healthy' : 'Unhealthy'}
                </div>
                {healthStatus.services && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-primary-text">Services:</p>
                    {Object.entries(healthStatus.services).map(([service, status]) => (
                      <div key={service} className="flex justify-between text-xs">
                        <span className="capitalize">{service}:</span>
                        <span className={status === 'configured' || status.includes('real') ? 'text-green-600' : 'text-red-600'}>
                          {status as string}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-secondary-text text-sm">Health check will run after connection test</p>
            )}
          </div>

          {/* Troubleshooting */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">🔧 Troubleshooting</h4>
            <div className="text-blue-700 text-sm space-y-1">
              <p>1. Make sure the backend server is running:</p>
              <code className="block bg-blue-100 p-2 rounded text-xs">./start-enhanced-backend.bat</code>
              <p>2. Check if port 3001 is available</p>
              <p>3. Verify no firewall is blocking the connection</p>
              <p>4. Ensure both frontend and backend are running</p>
            </div>
          </div>

          {/* Manual Test */}
          <div className="bg-background-light rounded-lg p-4">
            <h4 className="font-medium text-primary-text mb-2">Manual Test</h4>
            <p className="text-sm text-secondary-text mb-2">
              You can manually test the backend by opening this URL in a new tab:
            </p>
            <a 
              href="http://localhost:3001/test" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-brand hover:underline text-sm"
            >
              http://localhost:3001/test
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackendConnectionTest;