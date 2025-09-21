import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import { EtsyListing, MarketplaceProduct, SyncResult, MarketplaceType } from '../models/marketplace';
import { db } from '../firebase-config';

export class EtsyIntegrationService {
  private static readonly BASE_URL = 'https://openapi.etsy.com/v3';
  
  static async authenticateUser(code: string, redirectUri: string): Promise<any> {
    try {
      const clientId = functions.config().etsy?.client_id || process.env.ETSY_CLIENT_ID;
      const clientSecret = functions.config().etsy?.client_secret || process.env.ETSY_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        throw new Error('Etsy API credentials not configured');
      }

      const tokenResponse = await fetch(`${this.BASE_URL}/public/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Etsy authentication failed: ${tokenResponse.statusText}`);
      }

      return await tokenResponse.json();
    } catch (error) {
      console.error('Etsy authentication error:', error);
      throw error;
    }
  }

  static async refreshAccessToken(refreshToken: string): Promise<any> {
    try {
      const clientId = functions.config().etsy?.client_id || process.env.ETSY_CLIENT_ID;
      const clientSecret = functions.config().etsy?.client_secret || process.env.ETSY_CLIENT_SECRET;

      const response = await fetch(`${this.BASE_URL}/public/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  static async getUserShops(accessToken: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/application/users/me/shops`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': functions.config().etsy?.client_id || process.env.ETSY_CLIENT_ID || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch shops: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching user shops:', error);
      throw error;
    }
  }

  static async createListing(accessToken: string, shopId: string, listing: EtsyListing): Promise<any> {
    try {
      const listingData = {
        quantity: listing.inventory?.quantity || 1,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        who_made: listing.who_made,
        when_made: listing.when_made,
        taxonomy_id: listing.taxonomy_id || 1,
        shipping_template_id: null,
        materials: listing.materials,
        shop_section_id: listing.shop_section_id,
        processing_min: 1,
        processing_max: 3,
        tags: listing.tags.slice(0, 13), // Etsy allows max 13 tags
        styles: listing.style || [],
        item_weight: listing.shipping?.weight,
        item_length: listing.shipping?.dimensions?.length,
        item_width: listing.shipping?.dimensions?.width,
        item_height: listing.shipping?.dimensions?.height,
        item_weight_unit: 'g',
        item_dimensions_unit: 'mm',
        is_personalizable: false,
        personalization_is_required: false,
        is_supply: listing.is_supply,
        is_customizable: false,
        should_auto_renew: true,
        is_taxable: true,
        type: 'physical'
      };

      const response = await fetch(`${this.BASE_URL}/application/shops/${shopId}/listings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': functions.config().etsy?.client_id || process.env.ETSY_CLIENT_ID || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create listing: ${response.statusText} - ${errorData}`);
      }

      const createdListing = await response.json();
      
      // Upload images if provided
      if (listing.images && listing.images.length > 0) {
        await this.uploadListingImages(accessToken, shopId, createdListing.listing_id, listing.images);
      }

      return createdListing;
    } catch (error) {
      console.error('Error creating Etsy listing:', error);
      throw error;
    }
  }

  static async uploadListingImages(accessToken: string, shopId: string, listingId: string, imageUrls: string[]): Promise<void> {
    try {
      for (let i = 0; i < Math.min(imageUrls.length, 10); i++) { // Etsy allows max 10 images
        const imageUrl = imageUrls[i];
        
        // Download image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) continue;
        
        const imageBuffer = await imageResponse.buffer();
        
        // Upload to Etsy (simplified for demo)
        console.log(`Would upload image ${i + 1} for listing ${listingId}`);
      }
    } catch (error) {
      console.error('Error uploading listing images:', error);
      // Don't throw here as the listing was created successfully
    }
  }

  static async updateListing(accessToken: string, shopId: string, listingId: string, updates: Partial<EtsyListing>): Promise<any> {
    try {
      const updateData: any = {};
      
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.price) updateData.price = updates.price;
      if (updates.tags) updateData.tags = updates.tags.slice(0, 13);
      if (updates.materials) updateData.materials = updates.materials;
      if (updates.inventory?.quantity) updateData.quantity = updates.inventory.quantity;

      const response = await fetch(`${this.BASE_URL}/application/shops/${shopId}/listings/${listingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': functions.config().etsy?.client_id || process.env.ETSY_CLIENT_ID || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update listing: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating Etsy listing:', error);
      throw error;
    }
  }

  static async getListings(accessToken: string, shopId: string, limit: number = 25): Promise<any[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/application/shops/${shopId}/listings/active?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': functions.config().etsy?.client_id || process.env.ETSY_CLIENT_ID || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch listings: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching Etsy listings:', error);
      throw error;
    }
  }

  static async deleteListing(accessToken: string, listingId: string): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/application/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': functions.config().etsy?.client_id || process.env.ETSY_CLIENT_ID || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete listing: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting Etsy listing:', error);
      throw error;
    }
  }

  static convertToEtsyListing(product: MarketplaceProduct, shopId: string): EtsyListing {
    return {
      ...product,
      shop_id: shopId,
      state: 'draft',
      materials: product.tags.filter(tag => tag.length <= 20).slice(0, 13), // Etsy material constraints
      who_made: 'i_did',
      when_made: '2020_2024',
      is_supply: false,
      taxonomy_id: 1, // Default to "Craft Supplies & Tools"
    };
  }

  static async syncProducts(userId: string, accessToken: string, products: MarketplaceProduct[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      marketplace: MarketplaceType.ETSY,
      productsProcessed: 0,
      errors: [],
      syncedAt: new Date(),
    };

    try {
      // Get user's shops
      const shops = await this.getUserShops(accessToken);
      if (shops.length === 0) {
        throw new Error('No Etsy shops found for user');
      }

      const shopId = shops[0].shop_id; // Use first shop

      for (const product of products) {
        try {
          const etsyListing = this.convertToEtsyListing(product, shopId);
          await this.createListing(accessToken, shopId, etsyListing);
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
      console.error('Etsy sync error:', error);
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
      return result;
    }
  }
}