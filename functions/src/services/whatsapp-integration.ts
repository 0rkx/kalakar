// import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import { WhatsAppCatalog, WhatsAppProduct, WhatsAppMessage, MarketplaceProduct, SyncResult, MarketplaceType } from '../models/marketplace';
import { db } from '../firebase-config';

export class WhatsAppIntegrationService {
  private static readonly GRAPH_API_BASE_URL = 'https://graph.facebook.com/v18.0';
  
  static async sendMessage(accessToken: string, phoneNumberId: string, message: WhatsAppMessage): Promise<any> {
    try {
      const response = await fetch(`${this.GRAPH_API_BASE_URL}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`WhatsApp message send failed: ${response.statusText} - ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  static async createCatalog(accessToken: string, businessId: string, catalogName: string): Promise<WhatsAppCatalog> {
    try {
      const response = await fetch(`${this.GRAPH_API_BASE_URL}/${businessId}/product_catalogs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: catalogName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`WhatsApp catalog creation failed: ${response.statusText} - ${errorData}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        name: catalogName,
        products: [],
      };
    } catch (error) {
      console.error('Error creating WhatsApp catalog:', error);
      throw error;
    }
  }

  static async addProductToCatalog(accessToken: string, catalogId: string, product: WhatsAppProduct): Promise<any> {
    try {
      const response = await fetch(`${this.GRAPH_API_BASE_URL}/${catalogId}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          price: product.price * 100, // WhatsApp expects price in cents
          currency: product.currency,
          image_url: product.image_url,
          url: product.url,
          retailer_id: product.retailer_id,
          availability: product.availability,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`WhatsApp product creation failed: ${response.statusText} - ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding product to WhatsApp catalog:', error);
      throw error;
    }
  }

  static async updateProduct(accessToken: string, productId: string, updates: Partial<WhatsAppProduct>): Promise<any> {
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.description = updates.description;
      if (updates.price) updateData.price = updates.price * 100;
      if (updates.currency) updateData.currency = updates.currency;
      if (updates.image_url) updateData.image_url = updates.image_url;
      if (updates.url) updateData.url = updates.url;
      if (updates.availability) updateData.availability = updates.availability;

      const response = await fetch(`${this.GRAPH_API_BASE_URL}/${productId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`WhatsApp product update failed: ${response.statusText} - ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating WhatsApp product:', error);
      throw error;
    }
  }

  static async getCatalog(accessToken: string, catalogId: string): Promise<WhatsAppCatalog> {
    try {
      const response = await fetch(`${this.GRAPH_API_BASE_URL}/${catalogId}?fields=name,product_count`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch catalog: ${response.statusText}`);
      }

      const catalogData = await response.json();

      // Get products
      const productsResponse = await fetch(`${this.GRAPH_API_BASE_URL}/${catalogId}/products?fields=id,name,description,price,currency,image_url,url,retailer_id,availability`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const productsData = await productsResponse.json();

      return {
        id: catalogData.id,
        name: catalogData.name,
        products: productsData.data || [],
      };
    } catch (error) {
      console.error('Error fetching WhatsApp catalog:', error);
      throw error;
    }
  }

  static async deleteProduct(accessToken: string, productId: string): Promise<void> {
    try {
      const response = await fetch(`${this.GRAPH_API_BASE_URL}/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete product: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting WhatsApp product:', error);
      throw error;
    }
  }

  static convertToWhatsAppProduct(product: MarketplaceProduct): WhatsAppProduct {
    return {
      id: product.id,
      name: product.title,
      description: product.description.substring(0, 300), // WhatsApp has character limits
      price: product.price,
      currency: product.currency,
      image_url: product.images[0] || undefined,
      url: `https://kalakar-marketplace.com/products/${product.id}`,
      retailer_id: product.id,
      availability: (product.inventory?.quantity || 0) > 0 ? 'in stock' : 'out of stock',
    };
  }

  static async sendProductMessage(accessToken: string, phoneNumberId: string, to: string, product: WhatsAppProduct): Promise<any> {
    const message: WhatsAppMessage = {
      to,
      type: 'interactive',
      interactive: {
        type: 'product',
        body: {
          text: `Check out this amazing product: ${product.name}`,
        },
        action: {
          catalog_id: 'your_catalog_id',
          product_retailer_id: product.retailer_id,
        },
      },
    };

    return await this.sendMessage(accessToken, phoneNumberId, message);
  }

  static async sendProductListMessage(accessToken: string, phoneNumberId: string, to: string, products: WhatsAppProduct[], headerText: string = 'Our Products'): Promise<any> {
    const message: WhatsAppMessage = {
      to,
      type: 'interactive',
      interactive: {
        type: 'product_list',
        body: {
          text: 'Browse our amazing collection of handcrafted products',
        },
        action: {
          catalog_id: 'your_catalog_id',
          sections: [
            {
              title: headerText,
              product_items: products.slice(0, 10).map(product => ({
                product_retailer_id: product.retailer_id,
              })),
            },
          ],
        },
      },
    };

    return await this.sendMessage(accessToken, phoneNumberId, message);
  }

  static async sendWelcomeMessage(accessToken: string, phoneNumberId: string, to: string, userName?: string): Promise<any> {
    const message: WhatsAppMessage = {
      to,
      type: 'template',
      template: {
        name: 'welcome_message',
        language: {
          code: 'en',
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: userName || 'Friend',
              },
            ],
          },
        ],
      },
    };

    return await this.sendMessage(accessToken, phoneNumberId, message);
  }

  static async sendOrderConfirmation(accessToken: string, phoneNumberId: string, to: string, orderDetails: any): Promise<any> {
    const message: WhatsAppMessage = {
      to,
      type: 'text',
      text: {
        body: `🎉 Order Confirmed!\n\nOrder ID: ${orderDetails.orderId}\nTotal: ${orderDetails.currency} ${orderDetails.total}\n\nThank you for your purchase! We'll send you tracking information once your order ships.\n\nQuestions? Just reply to this message!`,
      },
    };

    return await this.sendMessage(accessToken, phoneNumberId, message);
  }

  static async handleIncomingMessage(accessToken: string, phoneNumberId: string, incomingMessage: any): Promise<any> {
    try {
      const from = incomingMessage.from;
      const messageType = incomingMessage.type;
      const messageContent = incomingMessage[messageType];

      // Simple message routing
      if (messageType === 'text') {
        const text = messageContent.body.toLowerCase();
        
        if (text.includes('hello') || text.includes('hi') || text.includes('start')) {
          return await this.sendWelcomeMessage(accessToken, phoneNumberId, from);
        } else if (text.includes('products') || text.includes('catalog') || text.includes('shop')) {
          // Send product catalog
          const message: WhatsAppMessage = {
            to: from,
            type: 'text',
            text: {
              body: 'Welcome to Kalakar Artisan Marketplace! 🎨\n\nDiscover unique handcrafted products made by talented artisans. Browse our catalog to find something special!\n\nType "help" for more options.',
            },
          };
          return await this.sendMessage(accessToken, phoneNumberId, message);
        } else if (text.includes('help')) {
          const message: WhatsAppMessage = {
            to: from,
            type: 'text',
            text: {
              body: 'Here\'s how I can help you:\n\n🛍️ Type "products" to browse our catalog\n📞 Type "contact" for customer support\n📦 Type "order" followed by your order ID to track\n💬 Just ask me anything about our products!\n\nWhat would you like to do?',
            },
          };
          return await this.sendMessage(accessToken, phoneNumberId, message);
        } else {
          // Default response
          const message: WhatsAppMessage = {
            to: from,
            type: 'text',
            text: {
              body: 'Thanks for your message! 😊\n\nI\'m here to help you discover amazing handcrafted products. Type "help" to see what I can do, or "products" to start shopping!',
            },
          };
          return await this.sendMessage(accessToken, phoneNumberId, message);
        }
      }

      return { success: true, message: 'Message processed' };
    } catch (error) {
      console.error('Error handling incoming WhatsApp message:', error);
      throw error;
    }
  }

  static async syncProducts(userId: string, accessToken: string, catalogId: string, products: MarketplaceProduct[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      marketplace: MarketplaceType.WHATSAPP,
      productsProcessed: 0,
      errors: [],
      syncedAt: new Date(),
    };

    try {
      for (const product of products) {
        try {
          const whatsappProduct = this.convertToWhatsAppProduct(product);
          await this.addProductToCatalog(accessToken, catalogId, whatsappProduct);
          result.productsProcessed++;
        } catch (error) {
          result.errors.push(`Failed to sync product ${product.title}: ${error}`);
          result.success = false;
        }
      }

      // Store sync result
      await db.collection('sync_results').add({
        userId,
        ...result,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      console.error('WhatsApp sync error:', error);
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
      return result;
    }
  }

  static async setupWebhook(accessToken: string, phoneNumberId: string, webhookUrl: string, verifyToken: string): Promise<any> {
    try {
      // This would typically be done through Facebook App settings
      // Here we simulate the webhook setup
      console.log('WhatsApp webhook setup simulated:', {
        phoneNumberId,
        webhookUrl,
        verifyToken,
      });

      return {
        success: true,
        message: 'Webhook configured successfully',
        webhookUrl,
        verifyToken,
      };
    } catch (error) {
      console.error('Error setting up WhatsApp webhook:', error);
      throw error;
    }
  }
}