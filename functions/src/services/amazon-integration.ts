import * as functions from 'firebase-functions';
import { AmazonProduct, MarketplaceProduct, SyncResult, MarketplaceType } from '../models/marketplace';
import { db } from '../firebase-config';

// Amazon SP-API Integration
export class AmazonIntegrationService {
  // private static readonly SP_API_BASE_URL = 'https://sellingpartnerapi-na.amazon.com';
  
  static async getAccessToken(refreshToken: string): Promise<string> {
    try {
      const clientId = functions.config().amazon?.client_id || process.env.AMAZON_CLIENT_ID;
      const clientSecret = functions.config().amazon?.client_secret || process.env.AMAZON_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        throw new Error('Amazon SP-API credentials not configured');
      }

      const response = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Amazon token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Amazon token refresh error:', error);
      throw error;
    }
  }

  static async createProduct(accessToken: string, product: AmazonProduct): Promise<any> {
    try {
      // This is a simplified implementation
      // In reality, Amazon SP-API requires complex XML feeds for product creation
      const productData = {
        productType: product.product_type,
        requirements: {
          sku: product.sku,
          condition: product.condition,
          conditionNote: product.description.substring(0, 1000),
          fulfillmentAvailability: {
            fulfillmentChannelCode: product.fulfillment_channel,
            quantity: product.inventory?.quantity || 1,
          },
          purchasableOffer: {
            currency: product.currency,
            ourPrice: [
              {
                schedule: [
                  {
                    valueWithTax: product.price,
                  },
                ],
              },
            ],
          },
        },
        attributes: {
          item_name: [
            {
              value: product.title,
              language_tag: 'en_US',
            },
          ],
          brand: [
            {
              value: product.brand,
            },
          ],
          manufacturer: [
            {
              value: product.manufacturer,
            },
          ],
          bullet_point: product.bullet_points.map(point => ({
            value: point,
            language_tag: 'en_US',
          })),
          generic_keyword: product.search_terms.map(term => ({
            value: term,
            language_tag: 'en_US',
          })),
          item_weight: product.shipping?.weight ? [
            {
              value: product.shipping.weight,
              unit: 'grams',
            },
          ] : undefined,
          item_dimensions: product.shipping?.dimensions ? [
            {
              length: {
                value: product.shipping.dimensions.length,
                unit: 'centimeters',
              },
              width: {
                value: product.shipping.dimensions.width,
                unit: 'centimeters',
              },
              height: {
                value: product.shipping.dimensions.height,
                unit: 'centimeters',
              },
            },
          ] : undefined,
        },
      };

      // Simulate API call - in real implementation, this would be a proper SP-API call
      console.log('Amazon product creation simulated:', productData);
      
      return {
        sku: product.sku,
        asin: `B${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        status: 'SUBMITTED',
        submissionId: `submission_${Date.now()}`,
      };
    } catch (error) {
      console.error('Error creating Amazon product:', error);
      throw error;
    }
  }

  static async updateProduct(accessToken: string, sku: string, updates: Partial<AmazonProduct>): Promise<any> {
    try {
      // Simulate product update
      console.log('Amazon product update simulated:', { sku, updates });
      
      return {
        sku,
        status: 'SUBMITTED',
        submissionId: `update_${Date.now()}`,
      };
    } catch (error) {
      console.error('Error updating Amazon product:', error);
      throw error;
    }
  }

  static async getProduct(accessToken: string, sku: string): Promise<any> {
    try {
      // Simulate product retrieval
      console.log('Amazon product retrieval simulated:', sku);
      
      return {
        sku,
        asin: `B${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        status: 'ACTIVE',
        title: 'Sample Product',
        price: 29.99,
        inventory: 10,
      };
    } catch (error) {
      console.error('Error fetching Amazon product:', error);
      throw error;
    }
  }

  static async getInventory(accessToken: string, skus?: string[]): Promise<any[]> {
    try {
      // Simulate inventory retrieval
      console.log('Amazon inventory retrieval simulated:', skus);
      
      const mockInventory = (skus || ['SKU001', 'SKU002']).map(sku => ({
        sku,
        asin: `B${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        fnSku: `FN${sku}`,
        sellerSku: sku,
        condition: 'NewItem',
        inventoryDetails: {
          fulfillableQuantity: Math.floor(Math.random() * 100),
          inboundWorkingQuantity: 0,
          inboundShippedQuantity: 0,
          inboundReceivingQuantity: 0,
        },
      }));

      return mockInventory;
    } catch (error) {
      console.error('Error fetching Amazon inventory:', error);
      throw error;
    }
  }

  static async updateInventory(accessToken: string, sku: string, quantity: number): Promise<any> {
    try {
      // Simulate inventory update
      console.log('Amazon inventory update simulated:', { sku, quantity });
      
      return {
        sku,
        quantity,
        status: 'SUBMITTED',
        submissionId: `inventory_${Date.now()}`,
      };
    } catch (error) {
      console.error('Error updating Amazon inventory:', error);
      throw error;
    }
  }

  static async getOrders(accessToken: string, createdAfter?: Date): Promise<any[]> {
    try {
      // Simulate order retrieval
      console.log('Amazon orders retrieval simulated:', createdAfter);
      
      const mockOrders = [
        {
          amazonOrderId: `ORDER-${Date.now()}`,
          purchaseDate: new Date().toISOString(),
          orderStatus: 'Shipped',
          fulfillmentChannel: 'AFN',
          salesChannel: 'Amazon.com',
          orderTotal: {
            currencyCode: 'USD',
            amount: '59.98',
          },
          numberOfItemsShipped: 2,
          numberOfItemsUnshipped: 0,
          paymentExecutionDetail: [],
          paymentMethod: 'Other',
          marketplaceId: 'ATVPDKIKX0DER',
          shipmentServiceLevelCategory: 'Standard',
          orderType: 'StandardOrder',
          earliestShipDate: new Date().toISOString(),
          latestShipDate: new Date(Date.now() + 86400000).toISOString(),
          isBusinessOrder: false,
          isPrime: true,
          isPremiumOrder: false,
          isGlobalExpressEnabled: false,
          replacedOrderId: null,
          isReplacementOrder: false,
        },
      ];

      return mockOrders;
    } catch (error) {
      console.error('Error fetching Amazon orders:', error);
      throw error;
    }
  }

  static convertToAmazonProduct(product: MarketplaceProduct): AmazonProduct {
    return {
      ...product,
      sku: product.id || `SKU_${Date.now()}`,
      product_type: 'PRODUCT',
      brand: 'Kalakar Artisan',
      manufacturer: 'Kalakar Artisan',
      bullet_points: [
        product.description.substring(0, 255),
        `Category: ${product.category}`,
        `Handcrafted with care`,
        `Unique artisan creation`,
        `Premium quality materials`,
      ].slice(0, 5),
      search_terms: product.tags.slice(0, 7), // Amazon allows max 7 search terms
      fulfillment_channel: 'FBM', // Fulfilled by Merchant by default
      condition: 'New',
    };
  }

  static async syncProducts(userId: string, accessToken: string, products: MarketplaceProduct[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      marketplace: MarketplaceType.AMAZON,
      productsProcessed: 0,
      errors: [],
      syncedAt: new Date(),
    };

    try {
      for (const product of products) {
        try {
          const amazonProduct = this.convertToAmazonProduct(product);
          await this.createProduct(accessToken, amazonProduct);
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
      console.error('Amazon sync error:', error);
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
      return result;
    }
  }

  static async generateProductFeed(products: AmazonProduct[]): Promise<string> {
    // Generate Amazon XML feed format
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
  <Header>
    <DocumentVersion>1.01</DocumentVersion>
    <MerchantIdentifier>MERCHANT_ID</MerchantIdentifier>
  </Header>
  <MessageType>Product</MessageType>`;

    const xmlFooter = `</AmazonEnvelope>`;

    const messages = products.map((product, index) => `
  <Message>
    <MessageID>${index + 1}</MessageID>
    <OperationType>Update</OperationType>
    <Product>
      <SKU>${product.sku}</SKU>
      <StandardProductID>
        <Type>UPC</Type>
        <Value>123456789012</Value>
      </StandardProductID>
      <ProductTaxCode>A_GEN_NOTAX</ProductTaxCode>
      <DescriptionData>
        <Title>${product.title}</Title>
        <Brand>${product.brand}</Brand>
        <Description>${product.description}</Description>
        <BulletPoint>${product.bullet_points.join('</BulletPoint><BulletPoint>')}</BulletPoint>
        <MSRP currency="${product.currency}">${product.price}</MSRP>
        <Manufacturer>${product.manufacturer}</Manufacturer>
        <SearchTerms>${product.search_terms.join(' ')}</SearchTerms>
      </DescriptionData>
      <ProductData>
        <Health>
          <ProductType>
            <HealthMisc>
              <Ingredients>${product.tags.join(', ')}</Ingredients>
            </HealthMisc>
          </ProductType>
        </Health>
      </ProductData>
    </Product>
  </Message>`).join('');

    return xmlHeader + messages + xmlFooter;
  }
}