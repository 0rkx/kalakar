import React, { useState } from 'react';
import useMobileConversation from '../hooks/useMobileConversation';

interface MobileConversationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileConversationSettings: React.FC<MobileConversationSettingsProps> = ({
  isOpen,
  onClose
}) => {
  const [mobileState, mobileActions] = useMobileConversation();
  const [localSettings, setLocalSettings] = useState(mobileState.settings);

  if (!isOpen) return null;

  const handleSettingChange = (key: keyof typeof localSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    mobileActions.updateSettings({ [key]: value });
  };

  const handleSave = () => {
    mobileActions.updateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      enableHapticFeedback: mobileState.deviceInfo.supportsVibration,
      optimizeForBattery: true,
      enableBackgroundPersistence: true,
      audioOptimization: 'balanced' as const,
      touchSensitivity: 'medium' as const
    };
    setLocalSettings(defaultSettings);
    mobileActions.updateSettings(defaultSettings);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Mobile Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Device Info */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Device Information</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Device Type:</span>
              <span className="font-medium">
                {mobileState.deviceInfo.isIOS ? 'iOS' : 
                 mobileState.deviceInfo.isAndroid ? 'Android' : 
                 mobileState.deviceInfo.isMobile ? 'Mobile' : 'Desktop'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Orientation:</span>
              <span className="font-medium capitalize">{mobileState.orientation.orientation}</span>
            </div>
            <div className="flex justify-between">
              <span>Screen Size:</span>
              <span className="font-medium">
                {mobileState.orientation.screenWidth} × {mobileState.orientation.screenHeight}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Vibration Support:</span>
              <span className={`font-medium ${mobileState.deviceInfo.supportsVibration ? 'text-green-600' : 'text-red-600'}`}>
                {mobileState.deviceInfo.supportsVibration ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Wake Lock Support:</span>
              <span className={`font-medium ${mobileState.deviceInfo.supportsWakeLock ? 'text-green-600' : 'text-red-600'}`}>
                {mobileState.deviceInfo.supportsWakeLock ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="p-6 space-y-6">
          {/* Haptic Feedback */}
          {mobileState.deviceInfo.supportsVibration && (
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-800">Haptic Feedback</label>
                <p className="text-xs text-gray-600">Vibrate on voice interactions</p>
              </div>
              <button
                onClick={() => handleSettingChange('enableHapticFeedback', !localSettings.enableHapticFeedback)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  localSettings.enableHapticFeedback ? 'bg-orange-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    localSettings.enableHapticFeedback ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Battery Optimization */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-800">Battery Optimization</label>
              <p className="text-xs text-gray-600">Reduce power consumption</p>
            </div>
            <button
              onClick={() => handleSettingChange('optimizeForBattery', !localSettings.optimizeForBattery)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.optimizeForBattery ? 'bg-orange-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.optimizeForBattery ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Background Persistence */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-800">Background Persistence</label>
              <p className="text-xs text-gray-600">Save conversation when app is backgrounded</p>
            </div>
            <button
              onClick={() => handleSettingChange('enableBackgroundPersistence', !localSettings.enableBackgroundPersistence)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.enableBackgroundPersistence ? 'bg-orange-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.enableBackgroundPersistence ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Audio Optimization */}
          <div>
            <label className="text-sm font-medium text-gray-800 block mb-2">Audio Quality</label>
            <div className="space-y-2">
              {(['quality', 'balanced', 'performance'] as const).map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    name="audioOptimization"
                    value={option}
                    checked={localSettings.audioOptimization === option}
                    onChange={() => handleSettingChange('audioOptimization', option)}
                    className="mr-3 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-sm text-gray-800 capitalize">{option}</span>
                    <p className="text-xs text-gray-600">
                      {option === 'quality' && 'Best audio quality, higher battery usage'}
                      {option === 'balanced' && 'Good quality with moderate battery usage'}
                      {option === 'performance' && 'Lower quality, optimized for battery'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Touch Sensitivity */}
          <div>
            <label className="text-sm font-medium text-gray-800 block mb-2">Touch Sensitivity</label>
            <div className="space-y-2">
              {(['low', 'medium', 'high'] as const).map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    name="touchSensitivity"
                    value={option}
                    checked={localSettings.touchSensitivity === option}
                    onChange={() => handleSettingChange('touchSensitivity', option)}
                    className="mr-3 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-sm text-gray-800 capitalize">{option}</span>
                    <p className="text-xs text-gray-600">
                      {option === 'low' && 'Smaller touch targets (36px)'}
                      {option === 'medium' && 'Standard touch targets (44px)'}
                      {option === 'high' && 'Larger touch targets (52px)'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileConversationSettings;