import { exportToEtsy, exportToAmazon, exportToWhatsApp } from '../marketplace-export';
import { ListingsItemsApi } from '@amazon-sp-api-release/amazon-sp-api-sdk-js';

jest.mock('@amazon-sp-api-release/amazon-sp-api-sdk-js', () => ({
  ListingsItemsApi: jest.fn(() => ({
    putListingsItem: jest.fn(),
  })),
  ApiClient: jest.fn(),
}));

describe('Marketplace Integrations', () => {
  // Mock data for testing
  const listing = {
    title: 'Test Product',
    description: 'This is a test product.',
    price: '25.00',
    category: 'handmade',
    tags: ['test', 'product'],
    features: ['feature1', 'feature2'],
    pricing: {
      usd: '25',
      inr: '2000',
    },
  };

  const userPreferences = {
    quantity: 1,
    etsyShippingTemplate: '12345',
    etsyShopSection: '67890',
    whatsappNumber: '+1234567890',
  };

  const conversationData = {
    id: 'conv123',
    turns: [],
    extractedInfo: {
      materials: ['wood', 'paint'],
      craftingProcess: 'hand-carved and painted',
    },
    language: 'en',
  };

  // Mock fetch
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockClear();
    (ListingsItemsApi as jest.Mock).mockClear();
  });

  describe('Etsy Integration', () => {
    it('should successfully export to Etsy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'test_access_token' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ listing_id: 'etsy123', url: 'https://etsy.com/listing/etsy123' }),
      });

      const result = await exportToEtsy(listing, userPreferences, conversationData);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('etsy');
      expect(result.listingId).toBe('etsy123');
    });

    it('should handle Etsy API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'test_access_token' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid request' }),
      });

      const result = await exportToEtsy(listing, userPreferences, conversationData);

      expect(result.success).toBe(false);
      expect(result.platform).toBe('etsy');
      expect(result.error).toContain('Etsy API request failed');
    });
  });

  describe('Amazon Integration', () => {
    it('should successfully export to Amazon', async () => {
      const mockPutListingsItem = jest.fn().mockResolvedValue({ sku: 'test-sku' });
      (ListingsItemsApi as jest.Mock).mockImplementation(() => ({
        putListingsItem: mockPutListingsItem,
      }));

      const result = await exportToAmazon(listing, userPreferences, conversationData);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('amazon');
      expect(result.sku).toBe('test-sku');
    });

    it('should handle Amazon API errors', async () => {
      const mockPutListingsItem = jest.fn().mockRejectedValue(new Error('Amazon API Error'));
      (ListingsItemsApi as jest.Mock).mockImplementation(() => ({
        putListingsItem: mockPutListingsItem,
      }));

      const result = await exportToAmazon(listing, userPreferences, conversationData);

      expect(result.success).toBe(false);
      expect(result.platform).toBe('amazon');
      expect(result.error).toBe('Amazon API Error');
    });
  });

  describe('WhatsApp Integration', () => {
    it('should successfully export to WhatsApp', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: 'wamid123' }] }),
      });

      const result = await exportToWhatsApp(listing, userPreferences, conversationData);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('whatsapp');
      expect(result.messageId).toBe('wamid123');
    });

    it('should handle WhatsApp API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Invalid phone number' } }),
      });

      const result = await exportToWhatsApp(listing, userPreferences, conversationData);

      expect(result.success).toBe(false);
      expect(result.platform).toBe('whatsapp');
      expect(result.error).toContain('WhatsApp API request failed');
    });
  });
});
