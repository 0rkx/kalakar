import { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationData, ConversationState } from '../types';
import { mobileConversationService, OrientationState, MobileConversationSettings } from '../services/mobile-conversation-service';

export interface MobileConversationState {
  orientation: OrientationState;
  isBackground: boolean;
  hasWakeLock: boolean;
  deviceInfo: ReturnType<typeof mobileConversationService.getDeviceInfo>;
  settings: MobileConversationSettings;
}

export interface MobileConversationActions {
  updateSettings: (settings: Partial<MobileConversationSettings>) => void;
  requestWakeLock: () => Promise<boolean>;
  releaseWakeLock: () => void;
  vibrate: (pattern: number | number[]) => boolean;
  saveToBackground: (data: ConversationData, state: ConversationState) => void;
  restoreFromBackground: () => { conversationData: ConversationData; conversationState: ConversationState } | null;
  clearBackgroundData: () => void;
  optimizeElementForScrolling: (element: HTMLElement) => void;
}

export const useMobileConversation = (): [MobileConversationState, MobileConversationActions] => {
  const [orientation, setOrientation] = useState<OrientationState>({
    orientation: 'portrait',
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 }
  });
  
  const [isBackground, setIsBackground] = useState(false);
  const [hasWakeLock, setHasWakeLock] = useState(false);
  const [settings, setSettings] = useState<MobileConversationSettings>(
    mobileConversationService.getSettings()
  );
  
  const deviceInfo = useRef(mobileConversationService.getDeviceInfo());
  const cleanupFunctions = useRef<(() => void)[]>([]);

  // Initialize mobile conversation service
  useEffect(() => {
    // Set up orientation listener
    const orientationCleanup = mobileConversationService.onOrientationChange(setOrientation);
    cleanupFunctions.current.push(orientationCleanup);

    // Set up background state listener
    const backgroundCleanup = mobileConversationService.onBackgroundStateChange(setIsBackground);
    cleanupFunctions.current.push(backgroundCleanup);

    // Cleanup on unmount
    return () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
      mobileConversationService.dispose();
    };
  }, []);

  // Handle background state changes
  useEffect(() => {
    if (isBackground) {
      // App went to background - release wake lock to save battery
      if (hasWakeLock) {
        mobileConversationService.releaseWakeLock();
        setHasWakeLock(false);
      }
    }
  }, [isBackground, hasWakeLock]);

  // Actions
  const updateSettings = useCallback((newSettings: Partial<MobileConversationSettings>) => {
    mobileConversationService.updateSettings(newSettings);
    setSettings(mobileConversationService.getSettings());
  }, []);

  const requestWakeLock = useCallback(async (): Promise<boolean> => {
    const success = await mobileConversationService.requestWakeLock();
    setHasWakeLock(success);
    return success;
  }, []);

  const releaseWakeLock = useCallback(() => {
    mobileConversationService.releaseWakeLock();
    setHasWakeLock(false);
  }, []);

  const vibrate = useCallback((pattern: number | number[]): boolean => {
    return mobileConversationService.vibrate(pattern);
  }, []);

  const saveToBackground = useCallback((data: ConversationData, state: ConversationState) => {
    mobileConversationService.saveConversationToBackground(data, state);
  }, []);

  const restoreFromBackground = useCallback(() => {
    return mobileConversationService.restoreConversationFromBackground();
  }, []);

  const clearBackgroundData = useCallback(() => {
    mobileConversationService.clearBackgroundData();
  }, []);

  const optimizeElementForScrolling = useCallback((element: HTMLElement) => {
    mobileConversationService.optimizeScrolling(element);
  }, []);

  const state: MobileConversationState = {
    orientation,
    isBackground,
    hasWakeLock,
    deviceInfo: deviceInfo.current,
    settings
  };

  const actions: MobileConversationActions = {
    updateSettings,
    requestWakeLock,
    releaseWakeLock,
    vibrate,
    saveToBackground,
    restoreFromBackground,
    clearBackgroundData,
    optimizeElementForScrolling
  };

  return [state, actions];
};

export default useMobileConversation;