import { ConversationData, ConversationState } from '../types';

export interface MobileConversationSettings {
  enableHapticFeedback: boolean;
  optimizeForBattery: boolean;
  enableBackgroundPersistence: boolean;
  audioOptimization: 'quality' | 'performance' | 'balanced';
  touchSensitivity: 'low' | 'medium' | 'high';
}

export interface OrientationState {
  orientation: 'portrait' | 'landscape';
  screenWidth: number;
  screenHeight: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

class MobileConversationService {
  private settings: MobileConversationSettings;
  private orientationListeners: ((state: OrientationState) => void)[] = [];
  private backgroundStateListeners: ((isBackground: boolean) => void)[] = [];
  private wakeLock: WakeLockSentinel | null = null;

  constructor() {
    this.settings = this.getDefaultSettings();
    this.initializeOrientationHandling();
    this.initializeBackgroundHandling();
  }

  private getDefaultSettings(): MobileConversationSettings {
    return {
      enableHapticFeedback: 'vibrate' in navigator,
      optimizeForBattery: true,
      enableBackgroundPersistence: true,
      audioOptimization: 'balanced',
      touchSensitivity: 'medium'
    };
  }

  private initializeOrientationHandling(): void {
    const handleOrientationChange = () => {
      const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      const state: OrientationState = {
        orientation,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        safeAreaInsets: this.getSafeAreaInsets()
      };
      
      this.orientationListeners.forEach(listener => listener(state));
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', () => {
      // Delay to ensure dimensions are updated
      setTimeout(handleOrientationChange, 100);
    });

    // Initial call
    handleOrientationChange();
  }

  private initializeBackgroundHandling(): void {
    const handleVisibilityChange = () => {
      const isBackground = document.hidden;
      this.backgroundStateListeners.forEach(listener => listener(isBackground));
      
      if (isBackground) {
        this.handleAppGoingToBackground();
      } else {
        this.handleAppComingToForeground();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  private getSafeAreaInsets() {
    // Get CSS environment variables for safe area insets
    const getEnvValue = (variable: string): number => {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(`env(${variable})`)
        .replace('px', '');
      return parseFloat(value) || 0;
    };

    return {
      top: getEnvValue('safe-area-inset-top'),
      bottom: getEnvValue('safe-area-inset-bottom'),
      left: getEnvValue('safe-area-inset-left'),
      right: getEnvValue('safe-area-inset-right')
    };
  }

  private async handleAppGoingToBackground(): Promise<void> {
    if (this.settings.enableBackgroundPersistence) {
      // Release wake lock when going to background
      if (this.wakeLock) {
        this.wakeLock.release();
        this.wakeLock = null;
      }
      
      // Stop any ongoing speech synthesis to save battery
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    }
  }

  private async handleAppComingToForeground(): Promise<void> {
    // Reacquire wake lock if needed
    if (this.settings.optimizeForBattery === false) {
      await this.requestWakeLock();
    }
  }

  // Public methods
  public updateSettings(newSettings: Partial<MobileConversationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): MobileConversationSettings {
    return { ...this.settings };
  }

  public onOrientationChange(listener: (state: OrientationState) => void): () => void {
    this.orientationListeners.push(listener);
    return () => {
      const index = this.orientationListeners.indexOf(listener);
      if (index > -1) {
        this.orientationListeners.splice(index, 1);
      }
    };
  }

  public onBackgroundStateChange(listener: (isBackground: boolean) => void): () => void {
    this.backgroundStateListeners.push(listener);
    return () => {
      const index = this.backgroundStateListeners.indexOf(listener);
      if (index > -1) {
        this.backgroundStateListeners.splice(index, 1);
      }
    };
  }

  public async requestWakeLock(): Promise<boolean> {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        return true;
      } catch (err) {
        console.warn('Wake lock request failed:', err);
        return false;
      }
    }
    return false;
  }

  public releaseWakeLock(): void {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
  }

  public vibrate(pattern: number | number[]): boolean {
    if (this.settings.enableHapticFeedback && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
        return true;
      } catch (err) {
        console.warn('Vibration failed:', err);
        return false;
      }
    }
    return false;
  }

  public getOptimalAudioSettings(): {
    sampleRate: number;
    channelCount: number;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
    latency: number;
  } {
    const baseSettings = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    switch (this.settings.audioOptimization) {
      case 'quality':
        return {
          ...baseSettings,
          sampleRate: 44100,
          channelCount: 2,
          latency: 0.2
        };
      case 'performance':
        return {
          ...baseSettings,
          sampleRate: 16000,
          channelCount: 1,
          latency: 0.05
        };
      case 'balanced':
      default:
        return {
          ...baseSettings,
          sampleRate: 22050,
          channelCount: 1,
          latency: 0.1
        };
    }
  }

  public getTouchTargetSize(): { minWidth: number; minHeight: number } {
    const baseSizes = {
      low: { minWidth: 36, minHeight: 36 },
      medium: { minWidth: 44, minHeight: 44 },
      high: { minWidth: 52, minHeight: 52 }
    };

    return baseSizes[this.settings.touchSensitivity];
  }

  public optimizeScrolling(element: HTMLElement): void {
    // Apply mobile-optimized scrolling properties
    element.style.webkitOverflowScrolling = 'touch';
    element.style.overscrollBehavior = 'contain';
    element.style.scrollBehavior = 'smooth';
  }

  public saveConversationToBackground(
    conversationData: ConversationData,
    conversationState: ConversationState
  ): void {
    if (this.settings.enableBackgroundPersistence) {
      try {
        const backgroundData = {
          conversationData,
          conversationState,
          timestamp: Date.now(),
          url: window.location.href
        };
        
        localStorage.setItem('mobile_conversation_backup', JSON.stringify(backgroundData));
      } catch (err) {
        console.warn('Failed to save conversation to background:', err);
      }
    }
  }

  public restoreConversationFromBackground(): {
    conversationData: ConversationData;
    conversationState: ConversationState;
  } | null {
    try {
      const backgroundData = localStorage.getItem('mobile_conversation_backup');
      if (backgroundData) {
        const parsed = JSON.parse(backgroundData);
        
        // Check if data is recent (within 24 hours)
        const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
        
        if (isRecent) {
          return {
            conversationData: parsed.conversationData,
            conversationState: parsed.conversationState
          };
        }
      }
    } catch (err) {
      console.warn('Failed to restore conversation from background:', err);
    }
    
    return null;
  }

  public clearBackgroundData(): void {
    try {
      localStorage.removeItem('mobile_conversation_backup');
    } catch (err) {
      console.warn('Failed to clear background data:', err);
    }
  }

  public getDeviceInfo(): {
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    hasNotchOrDynamicIsland: boolean;
    supportsWakeLock: boolean;
    supportsVibration: boolean;
    supportsSpeechSynthesis: boolean;
    supportsSpeechRecognition: boolean;
  } {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
                     window.innerWidth <= 768 ||
                     ('ontouchstart' in window);
    
    return {
      isMobile,
      isIOS: /iPad|iPhone|iPod/.test(userAgent),
      isAndroid: /Android/.test(userAgent),
      hasNotchOrDynamicIsland: this.getSafeAreaInsets().top > 20,
      supportsWakeLock: 'wakeLock' in navigator,
      supportsVibration: 'vibrate' in navigator,
      supportsSpeechSynthesis: 'speechSynthesis' in window,
      supportsSpeechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    };
  }

  public dispose(): void {
    this.orientationListeners = [];
    this.backgroundStateListeners = [];
    this.releaseWakeLock();
  }
}

// Export singleton instance
export const mobileConversationService = new MobileConversationService();
export default mobileConversationService;