import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

interface MarketplaceIntegration {
  id: string;
  type: 'etsy' | 'amazon' | 'whatsapp';
  isActive: boolean;
  lastSync?: Date;
  settings?: any;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  tags: string[];
  images: string[];
}

const MarketplaceIntegrations: React.FC = () => {
  const [integrations, setIntegrations] = useState<MarketplaceIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [syncResults, setSyncResults] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [conversationSession, setConversationSession] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', content: string}>>([]);
  const [currentMessage, setCurrentMessage] = useState('');

  const functions = getFunctions();
  const auth = getAuth();

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const getIntegrations = httpsCallable(functions, 'getMarketplaceIntegrations');
      const result = await getIntegrations();
      const data = result.data as any;
      
      if (data.success) {
        setIntegrations(data.integrations);
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEtsyIntegration = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would redirect to Etsy OAuth
      const credentials = {
        accessToken: 'demo_etsy_token',
        refreshToken: 'demo_refresh_token',
        shopId: 'demo_shop_id'
      };

      const createIntegration = httpsCallable(functions, 'createMarketplaceIntegration');
      const result = await createIntegration({
        type: 'etsy',
        credentials,
        settings: { autoSync: true }
      });

      const data = result.data as any;
      if (data.success) {
        await loadIntegrations();
        alert('Etsy integration created successfully!');
      }
    } catch (error) {
      console.error('Error creating Etsy integration:', error);
      alert('Failed to create Etsy integration');
    } finally {
      setLoading(false);
    }
  };

  const createAmazonIntegration = async () => {
    try {
      setLoading(true);
      
      const credentials = {
        accessToken: 'demo_amazon_token',
        refreshToken: 'demo_amazon_refresh',
        sellerId: 'demo_seller_id',
        marketplaceId: 'ATVPDKIKX0DER'
      };

      const createIntegration = httpsCallable(functions, 'createMarketplaceIntegration');
      const result = await createIntegration({
        type: 'amazon',
        credentials,
        settings: { fulfillmentChannel: 'FBM' }
      });

      const data = result.data as any;
      if (data.success) {
        await loadIntegrations();
        alert('Amazon integration created successfully!');
      }
    } catch (error) {
      console.error('Error creating Amazon integration:', error);
      alert('Failed to create Amazon integration');
    } finally {
      setLoading(false);
    }
  };

  const createWhatsAppIntegration = async () => {
    try {
      setLoading(true);
      
      const credentials = {
        accessToken: 'demo_whatsapp_token',
        phoneNumberId: 'demo_phone_number_id',
        businessId: 'demo_business_id'
      };

      const createIntegration = httpsCallable(functions, 'createMarketplaceIntegration');
      const result = await createIntegration({
        type: 'whatsapp',
        credentials,
        settings: { 
          catalogId: 'demo_catalog_id',
          autoRespond: true 
        }
      });

      const data = result.data as any;
      if (data.success) {
        await loadIntegrations();
        alert('WhatsApp integration created successfully!');
      }
    } catch (error) {
      console.error('Error creating WhatsApp integration:', error);
      alert('Failed to create WhatsApp integration');
    } finally {
      setLoading(false);
    }
  };

  const analyzeProductWithAI = async (product: Product) => {
    try {
      setLoading(true);
      const analyzeProduct = httpsCallable(functions, 'analyzeProductWithAI');
      const result = await analyzeProduct({
        productData: product,
        images: product.images
      });

      const data = result.data as any;
      if (data.success) {
        setAiAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Error analyzing product:', error);
      alert('Failed to analyze product with AI');
    } finally {
      setLoading(false);
    }
  };

  const syncProductToMarketplace = async (product: Product, marketplaceType: string) => {
    try {
      setLoading(true);
      const syncProduct = httpsCallable(functions, 'syncProductToMarketplace');
      const result = await syncProduct({
        product,
        marketplaceType
      });

      const data = result.data as any;
      if (data.success) {
        setSyncResults(prev => [...prev, data.result]);
        alert(`Product synced to ${marketplaceType} successfully!`);
      }
    } catch (error) {
      console.error('Error syncing product:', error);
      alert(`Failed to sync product to ${marketplaceType}`);
    } finally {
      setLoading(false);
    }
  };

  const syncToAllMarketplaces = async (product: Product) => {
    try {
      setLoading(true);
      const syncAll = httpsCallable(functions, 'syncProductToAllMarketplaces');
      const result = await syncAll({ product });

      const data = result.data as any;
      if (data.success) {
        setSyncResults(data.results);
        alert('Product synced to all marketplaces!');
      }
    } catch (error) {
      console.error('Error syncing to all marketplaces:', error);
      alert('Failed to sync to all marketplaces');
    } finally {
      setLoading(false);
    }
  };

  const startAIConversation = async () => {
    try {
      const startConversation = httpsCallable(functions, 'startAIConversation');
      const result = await startConversation({
        language: 'en',
        contextData: 'Product optimization and marketplace guidance'
      });

      const data = result.data as any;
      if (data.success) {
        setConversationSession(data.sessionId);
        setChatMessages([{
          role: 'ai',
          content: 'Hello! I\'m your AI assistant for marketplace optimization. How can I help you today?'
        }]);
      }
    } catch (error) {
      console.error('Error starting AI conversation:', error);
    }
  };

  const sendAIMessage = async () => {
    if (!conversationSession || !currentMessage.trim()) return;

    try {
      setChatMessages(prev => [...prev, { role: 'user', content: currentMessage }]);
      const userMessage = currentMessage;
      setCurrentMessage('');

      const continueConversation = httpsCallable(functions, 'continueAIConversation');
      const result = await continueConversation({
        sessionId: conversationSession,
        message: userMessage
      });

      const data = result.data as any;
      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'ai', content: data.response }]);
      }
    } catch (error) {
      console.error('Error sending AI message:', error);
    }
  };

  // Demo product for testing
  const demoProduct: Product = {
    id: 'demo_product_1',
    title: 'Handcrafted Ceramic Vase',
    description: 'Beautiful handmade ceramic vase with unique glaze pattern. Perfect for home decoration or as a gift.',
    price: 45.99,
    currency: 'USD',
    category: 'Home & Garden',
    tags: ['handmade', 'ceramic', 'vase', 'home decor', 'artisan'],
    images: ['https://example.com/vase1.jpg', 'https://example.com/vase2.jpg']
  };

  return (
    <div className="marketplace-integrations">
      <h2>Marketplace Integrations</h2>
      
      {loading && <div className="loading">Loading...</div>}

      {/* Integration Status */}
      <div className="integration-status">
        <h3>Connected Marketplaces</h3>
        {integrations.length === 0 ? (
          <p>No integrations connected yet.</p>
        ) : (
          <div className="integrations-list">
            {integrations.map(integration => (
              <div key={integration.id} className="integration-card">
                <h4>{integration.type.toUpperCase()}</h4>
                <p>Status: {integration.isActive ? 'Active' : 'Inactive'}</p>
                {integration.lastSync && (
                  <p>Last Sync: {new Date(integration.lastSync).toLocaleString()}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Integration Setup */}
      <div className="integration-setup">
        <h3>Connect New Marketplace</h3>
        <div className="integration-buttons">
          <button onClick={createEtsyIntegration} disabled={loading}>
            Connect Etsy
          </button>
          <button onClick={createAmazonIntegration} disabled={loading}>
            Connect Amazon
          </button>
          <button onClick={createWhatsAppIntegration} disabled={loading}>
            Connect WhatsApp Business
          </button>
        </div>
      </div>

      {/* Product Analysis */}
      <div className="product-analysis">
        <h3>AI Product Analysis</h3>
        <button onClick={() => analyzeProductWithAI(demoProduct)} disabled={loading}>
          Analyze Demo Product
        </button>
        
        {aiAnalysis && (
          <div className="analysis-results">
            <h4>Analysis Results</h4>
            <div className="analysis-content">
              <p><strong>Optimized Title:</strong> {aiAnalysis.title}</p>
              <p><strong>Category:</strong> {aiAnalysis.category}</p>
              <p><strong>Recommended Price:</strong> ${aiAnalysis.price_suggestion?.recommended}</p>
              <p><strong>SEO Keywords:</strong> {aiAnalysis.seo_keywords?.join(', ')}</p>
              <div>
                <strong>Market Insights:</strong>
                <ul>
                  <li>Demand Level: {aiAnalysis.market_insights?.demand_level}</li>
                  <li>Competition: {aiAnalysis.market_insights?.competition}</li>
                  <li>Target Audience: {aiAnalysis.market_insights?.target_audience?.join(', ')}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Sync */}
      <div className="product-sync">
        <h3>Product Sync</h3>
        <div className="sync-buttons">
          <button onClick={() => syncProductToMarketplace(demoProduct, 'etsy')} disabled={loading}>
            Sync to Etsy
          </button>
          <button onClick={() => syncProductToMarketplace(demoProduct, 'amazon')} disabled={loading}>
            Sync to Amazon
          </button>
          <button onClick={() => syncProductToMarketplace(demoProduct, 'whatsapp')} disabled={loading}>
            Sync to WhatsApp
          </button>
          <button onClick={() => syncToAllMarketplaces(demoProduct)} disabled={loading}>
            Sync to All
          </button>
        </div>

        {syncResults.length > 0 && (
          <div className="sync-results">
            <h4>Sync Results</h4>
            {syncResults.map((result, index) => (
              <div key={index} className="sync-result">
                <p><strong>{result.marketplace}:</strong> {result.success ? 'Success' : 'Failed'}</p>
                <p>Products Processed: {result.productsProcessed}</p>
                {result.errors.length > 0 && (
                  <p>Errors: {result.errors.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Chat Assistant */}
      <div className="ai-chat">
        <h3>AI Assistant</h3>
        {!conversationSession ? (
          <button onClick={startAIConversation}>Start AI Conversation</button>
        ) : (
          <div className="chat-interface">
            <div className="chat-messages">
              {chatMessages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  <strong>{message.role === 'user' ? 'You' : 'AI'}:</strong> {message.content}
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendAIMessage()}
                placeholder="Ask about product optimization, marketplace strategies..."
              />
              <button onClick={sendAIMessage}>Send</button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .marketplace-integrations {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading {
          text-align: center;
          padding: 20px;
          font-style: italic;
        }

        .integration-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
          background: #f9f9f9;
        }

        .integration-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .integration-buttons button,
        .sync-buttons button {
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }

        .integration-buttons button:hover,
        .sync-buttons button:hover {
          background: #0056b3;
        }

        .integration-buttons button:disabled,
        .sync-buttons button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .analysis-results,
        .sync-results {
          margin-top: 20px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f8f9fa;
        }

        .sync-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .sync-result {
          margin: 10px 0;
          padding: 10px;
          border-left: 4px solid #007bff;
          background: white;
        }

        .chat-interface {
          border: 1px solid #ddd;
          border-radius: 8px;
          height: 400px;
          display: flex;
          flex-direction: column;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          background: #f8f9fa;
        }

        .message {
          margin: 10px 0;
          padding: 8px 12px;
          border-radius: 8px;
        }

        .message.user {
          background: #007bff;
          color: white;
          margin-left: 20%;
        }

        .message.ai {
          background: white;
          border: 1px solid #ddd;
          margin-right: 20%;
        }

        .chat-input {
          display: flex;
          padding: 15px;
          border-top: 1px solid #ddd;
        }

        .chat-input input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-right: 10px;
        }

        .chat-input button {
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        h2, h3, h4 {
          color: #333;
          margin-bottom: 15px;
        }

        .integrations-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
        }
      `}</style>
    </div>
  );
};

export default MarketplaceIntegrations;