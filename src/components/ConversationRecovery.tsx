// src/components/ConversationRecovery.tsx

import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import useConversationPersistence from '../hooks/useConversationPersistence';
import { ConversationBackup } from '../services/conversation-persistence-service';

interface ConversationRecoveryProps {
  selectedLanguage: Language;
  onResumeConversation: (backup: ConversationBackup) => void;
  onStartNewConversation: () => void;
  onBack: () => void;
}

const ConversationRecovery: React.FC<ConversationRecoveryProps> = ({
  selectedLanguage,
  onResumeConversation,
  onStartNewConversation,
  onBack
}) => {
  const [persistenceState, persistenceHandlers] = useConversationPersistence();
  const [selectedBackup, setSelectedBackup] = useState<ConversationBackup | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    persistenceHandlers.loadAvailableBackups();
  }, []);

  const handleResumeConversation = async (backup: ConversationBackup) => {
    try {
      const resumedBackup = await persistenceHandlers.resumeConversation(backup.conversationData.id);
      if (resumedBackup) {
        onResumeConversation(resumedBackup);
      }
    } catch (error) {
      console.error('Failed to resume conversation:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await persistenceHandlers.deleteConversation(conversationId);
      setShowDeleteConfirm(null);
      // Reload backups
      await persistenceHandlers.loadAvailableBackups();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const getConversationPreview = (backup: ConversationBackup): string => {
    const lastUserResponse = backup.conversationData.turns
      .filter(turn => turn.type === 'user_response')
      .pop();
    
    if (lastUserResponse) {
      return lastUserResponse.content.substring(0, 100) + (lastUserResponse.content.length > 100 ? '...' : '');
    }
    
    return 'No responses yet';
  };

  const getConversationProgress = (backup: ConversationBackup): number => {
    const totalTurns = backup.conversationData.turns.length;
    const estimatedMaxTurns = 12; // Rough estimate for a complete conversation
    return Math.min((totalTurns / estimatedMaxTurns) * 100, 100);
  };

  if (persistenceState.isLoading) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-orange-50 to-red-50">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-800">Resume Conversation</h1>
          <p className="text-sm text-gray-600">
            {persistenceState.availableBackups.length} saved conversations
          </p>
        </div>
        
        <div className="w-16"></div>
      </div>

      {/* Network status */}
      {!persistenceState.isOnline && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-yellow-700 text-sm">
              You're offline. Showing locally saved conversations.
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {persistenceState.availableBackups.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No saved conversations</h3>
            <p className="text-gray-600 mb-6">Start a new conversation to begin creating your product listing.</p>
            <button
              onClick={onStartNewConversation}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Start New Conversation
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* New conversation option */}
            <div className="bg-white rounded-lg p-5 border-2 border-dashed border-gray-300 hover:border-orange-300 transition-colors min-h-[120px]">
              <button
                onClick={onStartNewConversation}
                className="w-full text-left h-full"
              >
                <div className="flex items-center h-full">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-base mb-1">Start New Conversation</h3>
                    <p className="text-sm text-gray-600">Begin a fresh conversation about your craft</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Saved conversations */}
            {persistenceState.availableBackups.map((backup) => (
              <div key={backup.conversationData.id} className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 w-full">
                <div className="space-y-4">
                  {/* Header with title and status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1 mr-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" 
                           style={{ 
                             backgroundColor: backup.conversationData.status === 'completed' ? '#10B981' : 
                                            backup.conversationData.status === 'in_progress' ? '#F59E0B' : '#EF4444'
                           }}>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-base">
                        {backup.conversationData.extractedInfo.productType || 'Untitled Conversation'}
                      </h3>
                    </div>
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0">
                      {backup.conversationData.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {getConversationPreview(backup)}
                  </p>
                  
                  {/* Metadata row */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{formatDate(backup.timestamp)}</span>
                    <span>{backup.conversationData.turns.length} message{backup.conversationData.turns.length !== 1 ? 's' : ''}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getConversationProgress(backup)}%` }}
                    ></div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={() => handleResumeConversation(backup)}
                      className="col-span-1 px-1 py-2 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition-colors font-medium text-center select-none pointer-events-auto"
                    >
                      Resume
                    </button>
                    
                    <button
                      onClick={() => setSelectedBackup(backup)}
                      className="col-span-1 px-1 py-2 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors font-medium text-center select-none pointer-events-auto"
                    >
                      Preview
                    </button>
                    
                    <button
                      onClick={() => setShowDeleteConfirm(backup.conversationData.id)}
                      className="col-span-1 px-1 py-2 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors font-medium text-center select-none pointer-events-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Conversation</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleDeleteConversation(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {selectedBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Conversation Preview</h3>
              <button
                onClick={() => setSelectedBackup(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              {selectedBackup.conversationData.turns.slice(-6).map((turn, index) => (
                <div key={turn.id} className={`p-3 rounded-lg ${
                  turn.type === 'ai_question' ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-green-50 border-l-4 border-green-400'
                }`}>
                  <div className="text-xs text-gray-500 mb-1">
                    {turn.type === 'ai_question' ? 'AI' : 'You'} • {formatDate(turn.timestamp)}
                  </div>
                  <p className="text-sm text-gray-800">{turn.content}</p>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setSelectedBackup(null);
                  handleResumeConversation(selectedBackup);
                }}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
              >
                Resume This Conversation
              </button>
              <button
                onClick={() => setSelectedBackup(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationRecovery;