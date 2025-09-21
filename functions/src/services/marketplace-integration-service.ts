import { MarketplaceIntegration, MarketplaceType, MarketplaceProduct, SyncResult } from '../models/marketplace';
import { EtsyIntegrationService } from './etsy-integration';
import { AmazonIntegrationService } from './amazon-integration';
import { WhatsAppIntegrationService } from './whatsapp-integration';
import { GeminiAIService } from './gemini-ai-service';
import { db } from '../firebase-config';

export class MarketplaceIntegrationService {
  static async createIntegration(userId: string, type: MarketplaceType, credentials: any, settings?: any): Promise<MarketplaceIntegration> {
    try {
      const integration: MarketplaceIntegration = {
        id: `${type}_${userId}_${Date.now()}`,
        userId,
        type,
        credentials,
        isActive: true,
        settings: settings || {},
      };

      // Validate credentials by testing connection
      await this.validateIntegration(integration);

      // Store integration
      await db.collection('marketplace_integrations').doc(integration.id).set({
        ...integration,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return integration;
    } catch (error) {
      console.error('Error creating marketplace integration:', error);
      throw new Error(`Failed to create ${type} integration: ${error}`);
    }
  }

  static async validateIntegration(integration: MarketplaceIntegration): Promise<boolean> {
    try {
      switch (integration.type) {
        case MarketplaceType.ETSY:
          // Test Etsy connection
          await EtsyIntegrationService.getUserShops(integration.credentials.accessToken);
          break;
          
        case MarketplaceType.AMAZON:
          // Test Amazon connection
          await AmazonIntegrationService.getAccessToken(integration.credentials.refreshToken);
          break;
          
        case MarketplaceType.WHATSAPP:
          // Test WhatsApp connection - simple validation
          if (!integration.credentials.accessToken || !integration.credentials.phoneNumberId) {
            throw new Error('WhatsApp credentials incomplete');
          }
          break;
          
        default:
          throw new Error(`Unsupported marketplace type: ${integration.type}`);
      }
      
      return true;
    } catch (error) {
      console.error('Integration validation failed:', error);
      throw error;
    }
  }

  static async getUserIntegrations(userId: string): Promise<MarketplaceIntegration[]> {
    try {
      const snapshot = await db.collection('marketplace_integrations')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as MarketplaceIntegration[];
    } catch (error) {
      console.error('Error fetching user integrations:', error);
      throw error;
    }
  }

  static async syncProductToMarketplace(
    userId: string, 
    product: MarketplaceProduct, 
    marketplaceType: MarketplaceType,
    options?: any
  ): Promise<SyncResult> {
    try {
      // Get user's integration for this marketplace
      const integrations = await this.getUserIntegrations(userId);
      const integration = integrations.find(i => i.type === marketplaceType);
      
      if (!integration) {
        throw new Error(`No ${marketplaceType} integration found for user`);
      }

      // Optimize product for marketplace using AI
      const optimizedProduct = await this.optimizeProductForMarketplace(product, marketplaceType);

      let result: SyncResult;

      switch (marketplaceType) {
        case MarketplaceType.ETSY:
          result = await EtsyIntegrationService.syncProducts(
            userId, 
            integration.credentials.accessToken, 
            [optimizedProduct]
          );
          break;
          
        case MarketplaceType.AMAZON:
          result = await AmazonIntegrationService.syncProducts(
            userId, 
            integration.credentials.accessToken, 
            [optimizedProduct]
          );
          break;
          
        case MarketplaceType.WHATSAPP:
          result = await WhatsAppIntegrationService.syncProducts(
            userId, 
            integration.credentials.accessToken,
            integration.settings?.catalogId || '',
            [optimizedProduct]
          );
          break;
          
        default:
          throw new Error(`Unsupported marketplace type: ${marketplaceType}`);
      }

      // Update integration last sync time
      await db.collection('marketplace_integrations').doc(integration.id).update({
        lastSync: new Date(),
        updatedAt: new Date(),
      });

      return result;
    } catch (error) {
      console.error('Product sync error:', error);
      throw error;
    }
  }

  static async syncProductToAllMarketplaces(userId: string, product: MarketplaceProduct): Promise<SyncResult[]> {
    try {
      const integrations = await this.getUserIntegrations(userId);
      const results: SyncResult[] = [];

      for (const integration of integrations) {
        try {
          const result = await this.syncProductToMarketplace(userId, product, integration.type);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            marketplace: integration.type,
            productsProcessed: 0,
            errors: [`Sync failed: ${error}`],
            syncedAt: new Date(),
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Multi-marketplace sync error:', error);
      throw error;
    }
  }

  static async optimizeProductForMarketplace(
    product: MarketplaceProduct, 
    marketplaceType: MarketplaceType
  ): Promise<MarketplaceProduct> {
    try {
      // Use Gemini AI to analyze and optimize the product
      const analysis = await GeminiAIService.analyzeProductForMarketplace(product, product.images);
      
      // Generate marketplace-specific optimizations
      const optimizations = await GeminiAIService.generateMarketplaceListings(
        analysis, 
        [marketplaceType]
      );

      const optimization = JSON.parse(optimizations[marketplaceType] || '{}');

      // Apply optimizations to product
      const optimizedProduct: MarketplaceProduct = {
        ...product,
        title: optimization.title || analysis.title || product.title,
        description: optimization.description || analysis.description || product.description,
        tags: [...new Set([...product.tags, ...analysis.tags, ...(optimization.tags || [])])],
        price: analysis.price_suggestion.recommended || product.price,
        seo: {
          ...product.seo,
          keywords: analysis.seo_keywords,
          metaTitle: optimization.metaTitle,
          metaDescription: optimization.metaDescription,
        },
      };

      return optimizedProduct;
    } catch (error) {
      console.error('Product optimization error:', error);
      // Return original product if optimization fails
      return product;
    }
  }

  static async generateMarketplaceReports(userId: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const integrations = await this.getUserIntegrations(userId);
      const reports: any = {};

      for (const integration of integrations) {
        try {
          let marketplaceData: any = {};

          switch (integration.type) {
            case MarketplaceType.ETSY:
              // Get Etsy shop data
              const shops = await EtsyIntegrationService.getUserShops(integration.credentials.accessToken);
              if (shops.length > 0) {
                const listings = await EtsyIntegrationService.getListings(
                  integration.credentials.accessToken, 
                  shops[0].shop_id
                );
                marketplaceData = {
                  shopCount: shops.length,
                  activeListings: listings.length,
                  shops: shops.map(shop => ({
                    id: shop.shop_id,
                    name: shop.shop_name,
                    url: shop.url,
                  })),
                };
              }
              break;

            case MarketplaceType.AMAZON:
              // Get Amazon inventory data
              const inventory = await AmazonIntegrationService.getInventory(integration.credentials.accessToken);
              const orders = await AmazonIntegrationService.getOrders(
                integration.credentials.accessToken,
                dateRange?.start
              );
              marketplaceData = {
                inventoryCount: inventory.length,
                orderCount: orders.length,
                totalRevenue: orders.reduce((sum, order) => sum + parseFloat(order.orderTotal.amount), 0),
              };
              break;

            case MarketplaceType.WHATSAPP:
              // Get WhatsApp catalog data
              if (integration.settings?.catalogId) {
                const catalog = await WhatsAppIntegrationService.getCatalog(
                  integration.credentials.accessToken,
                  integration.settings.catalogId
                );
                marketplaceData = {
                  catalogName: catalog.name,
                  productCount: catalog.products.length,
                };
              }
              break;
          }

          reports[integration.type] = {
            integration: {
              id: integration.id,
              type: integration.type,
              isActive: integration.isActive,
              lastSync: integration.lastSync,
            },
            data: marketplaceData,
          };
        } catch (error) {
          reports[integration.type] = {
            integration: {
              id: integration.id,
              type: integration.type,
              isActive: integration.isActive,
              lastSync: integration.lastSync,
            },
            error: `Failed to fetch data: ${error}`,
          };
        }
      }

      return reports;
    } catch (error) {
      console.error('Error generating marketplace reports:', error);
      throw error;
    }
  }

  static async updateIntegration(
    integrationId: string, 
    updates: Partial<MarketplaceIntegration>
  ): Promise<void> {
    try {
      await db.collection('marketplace_integrations').doc(integrationId).update({
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating integration:', error);
      throw error;
    }
  }

  static async deleteIntegration(integrationId: string): Promise<void> {
    try {
      await db.collection('marketplace_integrations').doc(integrationId).update({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error deleting integration:', error);
      throw error;
    }
  }

  static async refreshIntegrationCredentials(integrationId: string): Promise<void> {
    try {
      const doc = await db.collection('marketplace_integrations').doc(integrationId).get();
      if (!doc.exists) {
        throw new Error('Integration not found');
      }

      const integration = doc.data() as MarketplaceIntegration;

      switch (integration.type) {
        case MarketplaceType.ETSY:
          if (integration.credentials.refreshToken) {
            const newTokens = await EtsyIntegrationService.refreshAccessToken(
              integration.credentials.refreshToken
            );
            await this.updateIntegration(integrationId, {
              credentials: {
                ...integration.credentials,
                accessToken: newTokens.access_token,
                refreshToken: newTokens.refresh_token || integration.credentials.refreshToken,
              },
            });
          }
          break;

        case MarketplaceType.AMAZON:
          if (integration.credentials.refreshToken) {
            const newAccessToken = await AmazonIntegrationService.getAccessToken(
              integration.credentials.refreshToken
            );
            await this.updateIntegration(integrationId, {
              credentials: {
                ...integration.credentials,
                accessToken: newAccessToken,
              },
            });
          }
          break;

        case MarketplaceType.WHATSAPP:
          // WhatsApp tokens are long-lived, no refresh needed typically
          break;
      }
    } catch (error) {
      console.error('Error refreshing integration credentials:', error);
      throw error;
    }
  }

  static async getMarketplaceInsights(category: string, marketplaces: MarketplaceType[]): Promise<any> {
    try {
      const insights: any = {};

      for (const marketplace of marketplaces) {
        insights[marketplace] = await GeminiAIService.generateMarketInsights(
          category,
          `${marketplace} marketplace`
        );
      }

      return insights;
    } catch (error) {
      console.error('Error generating marketplace insights:', error);
      throw error;
    }
  }
}