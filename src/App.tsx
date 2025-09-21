import React, { useState } from 'react';
import { Language, UploadedPhoto, ProductListing, AppState, ConversationData } from './types';
import Dashboard from './components/Dashboard';
import OnboardingName from './components/OnboardingName';
import OnboardingLocation from './components/OnboardingLocation';
import OnboardingAudioWelcome from './components/OnboardingAudioWelcome';
import LanguageSelection from './components/LanguageSelection';
import VoiceWelcome from './components/VoiceWelcome';
import SimpleConversationInterface from './components/SimpleConversationInterface';
import ConversationSummary from './components/ConversationSummary';
import ConversationRecovery from './components/ConversationRecovery';
import VoiceRecording from './components/VoiceRecording';
import PhotoUpload from './components/PhotoUpload';
import PhotoCleanup from './components/PhotoCleanup';
import GeneratedListing from './components/GeneratedListing';
import ReviewScreen from './components/ReviewScreen';
import ExportStatus from './components/ExportStatus';
import ProfileScreen from './components/ProfileScreen';
import SettingsScreen from './components/SettingsScreen';
import ProductsScreen from './components/ProductsScreen';
import LocalTestingDemo from './components/LocalTestingDemo';
import MarketplaceIntegrations from './components/MarketplaceIntegrations';
import ContentBooster from './components/ContentBooster';
import TutorialsScreen from './components/TutorialsScreen';
import AIAssistantScreen from './components/AIAssistantScreen';

import Chatbot from './components/Chatbot';
import { analyzeProductPhotos, generateListing as apiGenerateListing } from './services/api';
import { backendApi } from './services/backendApi';

const App: React.FC = () => {
  console.log('🚀 App component rendering...');

  // Initialize app state with user data check
  const initializeAppState = (): AppState => {
    // For demo purposes, always start with onboarding/language selection
    const hasCompletedOnboarding = false; // Always start with onboarding for demo
    
    return {
      currentScreen: 'language', // Start with language selection
      selectedLanguage: null,
      transcript: '',
      uploadedPhotos: [],
      generatedListing: null,
      isRecording: false,
      isProcessing: false,
      userName: 'User', // Set a default name
      userLocation: '',
      conversationData: null,
      conversationState: null,
      userProfile: null,
      // Add new state for backend integration
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      knowledgeId: '',
      imageProcessingResult: null,
      productDescription: null
    };
  };

  const [appState, setAppState] = useState<AppState>(initializeAppState());

  const handleNameChange = (name: string) => {
    setAppState(prev => ({
      ...prev,
      userName: name
    }));
  };

  const goToLocationOnboarding = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'onboarding-location'
    }));
  };

  const handleLocationChange = (location: string) => {
    setAppState(prev => ({
      ...prev,
      userLocation: location
    }));
  };

  const goToWelcomeScreen = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'onboarding-welcome'
    }));
  };

  const goToAudioWelcome = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'onboarding-audio-welcome'
    }));
  };

  const goToLanguageSelection = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'language'
    }));
  };

  const handleLanguageSelect = (language: Language) => {
    setAppState(prev => ({
      ...prev,
      selectedLanguage: language
    }));
  };

  const goToConversationRecovery = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'conversation-recovery'
    }));
  };

  const goToVoiceWelcome = () => {
    setAppState(prev => ({
        ...prev,
        currentScreen: 'voice-welcome'
    }));
    };

  const goBackToLanguage = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'language'
    }));
  };

  const handleConversationComplete = (conversationData: ConversationData) => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'conversation-summary',
      conversationData,
      // Set transcript from conversation for backward compatibility
      transcript: `Product: ${conversationData.extractedInfo.productType || 'Handmade item'}`
    }));
  };

  const handleResumeConversation = (backup: any) => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'conversation',
      conversationData: backup.conversationData,
      conversationState: backup.conversationState,
      selectedLanguage: backup.conversationData.language
    }));
  };

  const handleStartNewConversation = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'conversation',
      conversationData: null,
      conversationState: null
    }));
  };

  const handleConversationSummaryConfirm = (extractedInfo: any) => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'photos',
      // Update conversation data with confirmed extracted info
      conversationData: prev.conversationData ? {
        ...prev.conversationData,
        extractedInfo
      } : null
    }));
  };

  const handleConversationSummaryEdit = () => {
    // For now, just go back to conversation - could be enhanced to edit specific fields
    setAppState(prev => ({
      ...prev,
      currentScreen: 'conversation'
    }));
  };

  const handleContinueConversation = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'conversation'
    }));
  };

  const goToPhotos = async (transcript: string) => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'photos',
      transcript
    }));

    // Generate product description immediately from voice note transcript
    try {
      console.log('📝 Generating product description from voice note transcript:', transcript);
      
      // Test if backend is reachable first
      console.log('🔍 Testing backend connection...');
      const healthCheck = await fetch('http://localhost:3001/health');
      console.log('🔍 Backend health check:', healthCheck.status);
      
      const descriptionResult = await backendApi.generateDescription(transcript);
      
      console.log('📝 Description result:', descriptionResult);
      
      if (descriptionResult.success) {
        setAppState(prev => ({
          ...prev,
          productDescription: descriptionResult.productDescription
        }));
        console.log('✅ Product description set in state:', descriptionResult.productDescription);
      } else {
        console.log('❌ Description generation failed:', descriptionResult.error);
      }
    } catch (error) {
      console.error('❌ Failed to generate product description:', error);
    }
  };

  const goBackFromPhotos = () => {
    // If we have conversation data, go back to conversation summary instead of recording
    if (appState.conversationData) {
      setAppState(prev => ({
        ...prev,
        currentScreen: 'conversation-summary'
      }));
    } else {
      setAppState(prev => ({
        ...prev,
        currentScreen: 'recording'
      }));
    }
  };

  const handlePhotosChange = (photos: UploadedPhoto[]) => {
    setAppState(prev => ({
      ...prev,
      uploadedPhotos: photos
    }));
  };



  const generateListing = async () => {
    // Skip listing generation - we already have the product description from voice note
    console.log('✅ Using product description from voice note, no additional listing generation needed');
    
    setAppState(prev => ({
      ...prev,
      currentScreen: 'review'
    }));
  };

  const goToReview = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'review'
    }));
  };

  const goBackToPhotos = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'photos'
    }));
  };

  const goToExportStatus = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'export-status'
    }));
  };

  const goToDashboardFinal = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'dashboard'
    }));
  };

  const goBackToReview = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'review'
    }));
  };

  const regenerateListing = async () => {
    // Regenerate product description from voice note
    console.log('🔄 Regenerating product description from voice note...');
    
    try {
      const descriptionResult = await backendApi.generateDescription(appState.transcript);
      
      if (descriptionResult.success) {
        setAppState(prev => ({
          ...prev,
          productDescription: descriptionResult.productDescription
        }));
        console.log('✅ Product description regenerated:', descriptionResult.productDescription);
      }
    } catch (error) {
      console.error('❌ Failed to regenerate product description:', error);
    }
  };



  const startCreateListing = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'language',
      // Reset state for new listing
      selectedLanguage: null,
      transcript: '',
      uploadedPhotos: [],
      generatedListing: null,
      isRecording: false,
      isProcessing: false,
      conversationData: null,
      conversationState: null
    }));
  };

  const goToDashboard = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'dashboard'
    }));
  };

  const handleResumeConversationFromDashboard = () => {
    // In a real implementation, this would load the conversation from storage
    // For now, just navigate to conversation recovery
    setAppState(prev => ({
      ...prev,
      currentScreen: 'conversation-recovery'
    }));
  };

  const goToProfile = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'profile'
    }));
  };

  const goToSettings = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'settings'
    }));
  };

  const goToProducts = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'products'
    }));
  };

  const goToTesting = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'testing'
    }));
  };

  const goToBackendTest = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'ai-assistant'
    }));
  };

  const goToMarketplace = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'marketplace'
    }));
  };

  const goToContentBooster = () => {
    setAppState(prev => ({
        ...prev,
        currentScreen: 'content-booster'
    }));
    };

  const goToTutorials = () => {
    setAppState(prev => ({
        ...prev,
        currentScreen: 'tutorials'
    }));
    }

  const goToAIAssistant = () => {
    setAppState(prev => ({
        ...prev,
        currentScreen: 'ai-assistant'
    }));
    }

  const renderCurrentScreen = () => {
    console.log('📱 Rendering screen:', appState.currentScreen);
    
    try {
      switch (appState.currentScreen) {
      case 'dashboard':
        return (
          <Dashboard
            userName={appState.userName}
            onCreateListing={startCreateListing}
            conversationHistory={[]} // TODO: Load from storage/Firebase
            onResumeConversation={handleResumeConversationFromDashboard}
            onNavigateToProfile={goToProfile}
            onNavigateToSettings={goToSettings}
            onNavigateToProducts={goToProducts}
            onNavigateToTesting={goToBackendTest}
            onNavigateToMarketplace={goToMarketplace}
            onNavigateToContentBooster={goToContentBooster}
            onNavigateToTutorials={goToTutorials}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            userName={appState.userName}
            userLocation={appState.userLocation}
            onBack={goToDashboard}
            onNavigateToProducts={goToProducts}
            onNavigateToHelp={goToTutorials}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            onBack={goToDashboard}
          />
        );
      case 'products':
        return (
          <ProductsScreen
            onBack={goToDashboard}
            onNavigateToProfile={goToProfile}
            onNavigateToHelp={goToTutorials}
          />
        );
      case 'testing':
        return (
          <LocalTestingDemo />
        );

      case 'marketplace':
        return (
          <MarketplaceIntegrations />
        );
      case 'content-booster':
        return (
            <ContentBooster
                userId={appState.userProfile?.id || ''}
                onBack={goToDashboard}
            />
        );
      case 'tutorials':
        return (
            <TutorialsScreen
                onBack={goToDashboard}
                onNavigateToProducts={goToProducts}
                onNavigateToProfile={goToProfile}
                onNavigateToAIAssistant={goToAIAssistant}
                userId={appState.userProfile?.id || 'demo-user'}
            />
        );
      case 'ai-assistant':
        return (
            <AIAssistantScreen
                onBack={goToTutorials}
                onNavigateToProducts={goToProducts}
                onNavigateToProfile={goToProfile}
                userId={appState.userProfile?.id || 'demo-user'}
            />
        );
      case 'onboarding-name':
        return (
          <OnboardingName
            userName={appState.userName}
            onNameChange={handleNameChange}
            onContinue={goToLocationOnboarding}
          />
        );
      case 'onboarding-location':
        return (
          <OnboardingLocation
            userLocation={appState.userLocation}
            onLocationChange={handleLocationChange}
            onContinue={goToLanguageSelection}
            onBack={() => setAppState(prev => ({ ...prev, currentScreen: 'onboarding-name' }))}
          />
        );
      case 'language':
        return (
          <LanguageSelection
            selectedLanguage={appState.selectedLanguage}
            onLanguageSelect={handleLanguageSelect}
            onContinue={goToWelcomeScreen}
            onBack={goToDashboard}
          />
        );
      case 'onboarding-welcome':
        return (
          <OnboardingName
            userName={appState.userName}
            onContinue={goToAudioWelcome}
            onBack={goToLanguageSelection}
          />
        );
      case 'onboarding-audio-welcome':
        return (
          <OnboardingAudioWelcome
            selectedLanguage={appState.selectedLanguage!}
            onContinue={(transcript: string) => {
              setAppState(prev => ({ ...prev, transcript }));
              goToPhotos(transcript);
            }}
            onBack={goToWelcomeScreen}
          />
        );
    case 'voice-welcome':
        return (
            <VoiceWelcome
                selectedLanguage={appState.selectedLanguage!}
                onContinue={() => setAppState(prev => ({ ...prev, currentScreen: 'recording' }))}
                onBack={goBackToLanguage}
            />
        );
      case 'conversation-recovery':
        return (
          <ConversationRecovery
            selectedLanguage={appState.selectedLanguage!}
            onResumeConversation={handleResumeConversation}
            onStartNewConversation={handleStartNewConversation}
            onBack={goBackToLanguage}
          />
        );
      case 'conversation':
        return (
          <SimpleConversationInterface
            selectedLanguage={appState.selectedLanguage!}
            userName={appState.userName}
            userLocation={appState.userLocation}
            sessionId={appState.sessionId}
            onConversationComplete={(conversationData, knowledgeId) => {
              setAppState(prev => ({
                ...prev,
                conversationData,
                knowledgeId
              }));
              handleConversationComplete(conversationData);
            }}
            onBack={goBackToLanguage}
            resumedConversationData={appState.conversationData || undefined}
            resumedConversationState={appState.conversationState || undefined}
          />
        );
      case 'conversation-summary':
        return (
          <ConversationSummary
            conversationId={appState.conversationData?.id || ''}
            productInfo={appState.conversationData?.extractedInfo}
            onConfirm={handleConversationSummaryConfirm}
            onEdit={handleConversationSummaryEdit}
            onContinueConversation={handleContinueConversation}
          />
        );
      case 'recording':
        return (
          <VoiceRecording
            selectedLanguage={appState.selectedLanguage!}
            onBack={goBackToLanguage}
            onNext={goToPhotos}
          />
        );
      case 'photos':
        return (
          <PhotoUpload
            uploadedPhotos={appState.uploadedPhotos}
            onPhotosChange={handlePhotosChange}
            onBack={goBackFromPhotos}
            onNext={() => setAppState(prev => ({ ...prev, currentScreen: 'review' }))}
            conversationData={appState.conversationData}
            sessionId={appState.sessionId}
            knowledgeId={appState.knowledgeId}
          />
        );



      case 'listing':
        return (
          <GeneratedListing
            uploadedPhotos={appState.uploadedPhotos}
            generatedListing={appState.generatedListing!}
            onBack={goToReview}
            onRegenerate={regenerateListing}
          />
        );
      case 'review':
        return (
          <ReviewScreen
            uploadedPhotos={appState.uploadedPhotos}
            generatedListing={appState.generatedListing}
            userName={appState.userName}
            isGenerating={appState.isProcessing}
            conversationData={appState.conversationData}
            productDescription={appState.productDescription}
            transcript={appState.transcript}
            onBack={goBackToPhotos}
            onExport={goToExportStatus}
            onGenerateListing={generateListing}
          />
        );
      case 'export-status':
        return (
          <ExportStatus
            listing={appState.generatedListing!}
            conversationData={appState.conversationData}
            userProfile={appState.userProfile}
            onBack={() => setAppState(prev => ({ ...prev, currentScreen: 'review' }))}
            onComplete={goToDashboardFinal}
          />
        );
      default:
        console.log('❌ Unknown screen:', appState.currentScreen);
        return (
          <div className="h-full w-full flex items-center justify-center bg-white">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Screen Error</h1>
              <p className="text-gray-600 mb-4">Unknown screen: {appState.currentScreen}</p>
              <button 
                onClick={() => setAppState(prev => ({ ...prev, currentScreen: 'dashboard' }))}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        );
    }
    } catch (error) {
      console.error('❌ Error rendering screen:', error);
      return (
        <div className="h-full w-full flex items-center justify-center bg-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Render Error</h1>
            <p className="text-gray-600 mb-4">Error: {error.message}</p>
            <button 
              onClick={() => setAppState(prev => ({ ...prev, currentScreen: 'dashboard' }))}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  };

  console.log('📊 App state:', { currentScreen: appState.currentScreen, userName: appState.userName });

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      {renderCurrentScreen()}
    </div>
  );
};

export default App;