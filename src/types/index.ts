export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface UploadedPhoto {
  file: File;
  dataUrl: string;
  id: string;
}

export interface ProductListing {
  title: string;
  description: string;
  features: string[];
  bio: string;
  tags: string[];
}

export interface AppState {
  currentScreen: 'dashboard' | 'onboarding-name' | 'onboarding-location' | 'language' | 'recording' | 'photos' | 'listing' | 'photo-cleanup' | 'review' | 'export-status';
  selectedLanguage: Language | null;
  transcript: string;
  uploadedPhotos: UploadedPhoto[];
  generatedListing: ProductListing | null;
  isRecording: boolean;
  isProcessing: boolean;
  userName: string;
  userLocation: string;
}

export interface ExportStatus {
  platform: ExportPlatform;
  status: 'queued' | 'processing' | 'success' | 'failed';
  timestamp?: Date;
}

export type ExportPlatform = 'etsy' | 'amazon' | 'whatsapp';