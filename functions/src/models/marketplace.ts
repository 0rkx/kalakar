export interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  tags: string[];
  images: string[];
  variations?: ProductVariation[];
  shipping?: ShippingInfo;
  inventory?: InventoryInfo;
  seo?: SEOInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariation {
  id: string;
  name: string;
  options: VariationOption[];
  price?: number;
  sku?: string;
  inventory?: number;
}

export interface VariationOption {
  name: string;
  value: string;
  priceModifier?: number;
}

export interface ShippingInfo {
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  shippingProfiles?: string[];
  processingTime?: string;
}

export interface InventoryInfo {
  quantity: number;
  trackQuantity: boolean;
  lowStockThreshold?: number;
}

export interface SEOInfo {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
}

// Etsy specific models
export interface EtsyListing extends MarketplaceProduct {
  shop_id: string;
  listing_id?: string;
  state: 'draft' | 'active' | 'inactive' | 'expired';
  materials: string[];
  shop_section_id?: string;
  style?: string[];
  who_made: 'i_did' | 'collective' | 'someone_else';
  when_made: string;
  is_supply: boolean;
  recipient?: string;
  occasion?: string;
  taxonomy_id?: number;
}

// Amazon specific models
export interface AmazonProduct extends MarketplaceProduct {
  asin?: string;
  sku: string;
  product_type: string;
  brand: string;
  manufacturer: string;
  bullet_points: string[];
  search_terms: string[];
  intended_use?: string;
  target_audience?: string;
  fulfillment_channel: 'FBA' | 'FBM';
  condition: 'New' | 'Used' | 'Refurbished';
}

// WhatsApp Business models
export interface WhatsAppCatalog {
  id: string;
  name: string;
  products: WhatsAppProduct[];
}

export interface WhatsAppProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  url?: string;
  retailer_id: string;
  availability: 'in stock' | 'out of stock';
}

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'image' | 'interactive' | 'template';
  text?: {
    body: string;
  };
  image?: {
    link: string;
    caption?: string;
  };
  interactive?: {
    type: 'product' | 'product_list' | 'button';
    body?: {
      text: string;
    };
    action: any;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
}

export enum MarketplaceType {
  ETSY = 'etsy',
  AMAZON = 'amazon',
  WHATSAPP = 'whatsapp'
}

export interface MarketplaceIntegration {
  id: string;
  userId: string;
  type: MarketplaceType;
  credentials: {
    [key: string]: string;
  };
  isActive: boolean;
  lastSync?: Date;
  settings?: {
    [key: string]: any;
  };
}

export interface SyncResult {
  success: boolean;
  marketplace: MarketplaceType;
  productsProcessed: number;
  errors: string[];
  syncedAt: Date;
}