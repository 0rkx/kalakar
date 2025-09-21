import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import SpeechTest from './SpeechTest';
import UniversalSpeechTest from './UniversalSpeechTest';

const LocalTestingDemo: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      addLog(user ? `✅ Authenticated as: ${user.uid}` : '❌ Not authenticated');
    });

    return () => unsubscribe();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const addResult = (title: string, data: any) => {
    setResults(prev => [...prev, { title, data, timestamp: new Date().toLocaleTimeString() }]);
  };

  const signInAnonymouslyHandler = async () => {
    try {
      setLoading(true);
      addLog('🔐 Signing in anonymously...');
      const userCredential = await signInAnonymously(auth);
      addLog(`✅ Signed in as: ${userCredential.user.uid}`);
    } catch (error) {
      addLog(`❌ Sign in error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testHealthCheck = async () => {
    try {
      setLoading(true);
      addLog('🏥 Testing health check...');
      
      const healthCheck = httpsCallable(functions, 'healthCheck');
      const result = await healthCheck();
      
      addLog('✅ Health check successful');
      addResult('Health Check', result.data);
    } catch (error) {
      addLog(`❌ Health check error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testGeminiAI = async () => {
    if (!user) {
      addLog('❌ Please sign in first');
      return;
    }

    try {
      setLoading(true);
      addLog('🤖 Testing Gemini AI integration...');
      
      const analyzeProduct = httpsCallable(functions, 'analyzeProductWithAI');
      const result = await analyzeProduct({
        productData: {
          title: 'Handmade Ceramic Coffee Mug',
          description: 'Beautiful ceramic mug with unique glaze pattern',
          price: 28.99,
          category: 'Kitchen & Dining',
          tags: ['handmade', 'ceramic', 'coffee', 'mug', 'artisan']
        },
        images: []
      });
      
      addLog('✅ Gemini AI analysis successful');
      addResult('Gemini AI Analysis', result.data);
    } catch (error) {
      addLog(`❌ Gemini AI error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testMarketplaceIntegration = async () => {
    if (!user) {
      addLog('❌ Please sign in first');
      return;
    }

    try {
      setLoading(true);
      addLog('🛍️ Testing marketplace integration...');
      
      const createIntegration = httpsCallable(functions, 'createMarketplaceIntegration');
      const result = await createIntegration({
        type: 'etsy',
        credentials: {
          accessToken: 'demo_etsy_token',
          refreshToken: 'demo_refresh_token',
          shopId: 'demo_shop_123'
        },
        settings: {
          autoSync: true
        }
      });
      
      addLog('✅ Marketplace integration created');
      addResult('Marketplace Integration', result.data);
    } catch (error) {
      addLog(`❌ Marketplace integration error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testAIConversation = async () => {
    if (!user) {
      addLog('❌ Please sign in first');
      return;
    }

    try {
      setLoading(true);
      addLog('💬 Testing AI conversation...');
      
      // Start conversation
      const startConversation = httpsCallable(functions, 'startAIConversation');
      const sessionResult = await startConversation({
        language: 'en',
        contextData: 'Product optimization consultation'
      });
      
      addLog('✅ AI conversation started');
      addResult('AI Conversation Start', sessionResult.data);
      
      // Continue conversation
      const continueConversation = httpsCallable(functions, 'continueAIConversation');
      const responseResult = await continueConversation({
        sessionId: sessionResult.data.sessionId,
        message: 'How can I optimize my ceramic products for Etsy marketplace?'
      });
      
      addLog('✅ AI conversation response received');
      addResult('AI Conversation Response', responseResult.data);
    } catch (error) {
      addLog(`❌ AI conversation error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testProductSync = async () => {
    if (!user) {
      addLog('❌ Please sign in first');
      return;
    }

    try {
      setLoading(true);
      addLog('🔄 Testing product sync...');
      
      const syncProduct = httpsCallable(functions, 'syncProductToMarketplace');
      const result = await syncProduct({
        product: {
          id: 'test_product_1',
          title: 'Handcrafted Ceramic Vase',
          description: 'Beautiful handmade ceramic vase with unique glaze pattern',
          price: 45.99,
          currency: 'USD',
          category: 'Home & Garden',
          tags: ['handmade', 'ceramic', 'vase', 'home decor', 'artisan'],
          images: ['https://example.com/vase1.jpg'],
          inventory: { quantity: 5, trackQuantity: true },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        marketplaceType: 'etsy'
      });
      
      addLog('✅ Product sync successful');
      addResult('Product Sync', result.data);
    } catch (error) {
      addLog(`❌ Product sync error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setResults([]);
  };

  return (
    <div className="local-testing-demo">
      <h2>🧪 Local Testing Demo</h2>
      
      {/* Authentication Status */}
      <div className="auth-status">
        <h3>Authentication Status</h3>
        <p>Status: {user ? '✅ Authenticated' : '❌ Not authenticated'}</p>
        {user && <p>User ID: {user.uid}</p>}
        {!user && (
          <button onClick={signInAnonymouslyHandler} disabled={loading}>
            Sign In Anonymously
          </button>
        )}
      </div>

      {/* Test Buttons */}
      <div className="test-buttons">
        <h3>Test Functions</h3>
        <div className="button-grid">
          <button onClick={testHealthCheck} disabled={loading}>
            🏥 Health Check
          </button>
          <button onClick={testGeminiAI} disabled={loading || !user}>
            🤖 Test Gemini AI
          </button>
          <button onClick={testMarketplaceIntegration} disabled={loading || !user}>
            🛍️ Test Marketplace
          </button>
          <button onClick={testAIConversation} disabled={loading || !user}>
            💬 Test AI Chat
          </button>
          <button onClick={testProductSync} disabled={loading || !user}>
            🔄 Test Product Sync
          </button>
          <button onClick={clearLogs} disabled={loading}>
            🗑️ Clear Logs
          </button>
        </div>
      </div>

      {/* Speech Recognition Tests */}
      <div className="speech-test-section">
        <h3>🎤 Speech Recognition Tests</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <h4 className="font-medium mb-2">Web Speech API (Chrome/Edge only)</h4>
            <SpeechTest />
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Universal (All Browsers)</h4>
            <UniversalSpeechTest />
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="loading">
          <p>⏳ Processing...</p>
        </div>
      )}

      {/* Logs */}
      <div className="logs-section">
        <h3>📋 Logs</h3>
        <div className="logs">
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="results-section">
        <h3>📊 Results</h3>
        <div className="results">
          {results.map((result, index) => (
            <div key={index} className="result-entry">
              <h4>{result.title} ({result.timestamp})</h4>
              <pre>{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .local-testing-demo {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .auth-status {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #007bff;
        }

        .test-buttons {
          margin-bottom: 30px;
        }

        .button-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin-top: 15px;
        }

        .speech-test-section {
          margin-bottom: 30px;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #28a745;
        }

        .button-grid button {
          padding: 12px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .button-grid button:hover:not(:disabled) {
          background: #0056b3;
        }

        .button-grid button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .loading {
          text-align: center;
          padding: 20px;
          background: #fff3cd;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .logs-section, .results-section {
          margin-bottom: 30px;
        }

        .logs {
          background: #1e1e1e;
          color: #ffffff;
          padding: 15px;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          max-height: 300px;
          overflow-y: auto;
        }

        .log-entry {
          margin-bottom: 5px;
          padding: 2px 0;
        }

        .results {
          max-height: 400px;
          overflow-y: auto;
        }

        .result-entry {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .result-entry h4 {
          margin: 0 0 10px 0;
          color: #495057;
        }

        .result-entry pre {
          background: #ffffff;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          padding: 10px;
          font-size: 11px;
          overflow-x: auto;
          margin: 0;
        }

        h2, h3 {
          color: #343a40;
          margin-bottom: 15px;
        }

        h2 {
          border-bottom: 2px solid #007bff;
          padding-bottom: 10px;
        }
      `}</style>
    </div>
  );
};

export default LocalTestingDemo;