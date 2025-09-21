import React, { useState, useEffect } from 'react';
import { ExportStatus as ExportStatusType, ProductListing } from '../types';
import { exportToMarketplace, generateConversationExportReport } from '../services/api';

interface ExportStatusProps {
  listing: ProductListing;
  conversationData?: any;
  userProfile?: any;
  onBack: () => void;
  onComplete: () => void;
}

const ExportStatus: React.FC<ExportStatusProps> = ({ listing, conversationData, userProfile, onBack, onComplete }) => {
  const [exportStatuses, setExportStatuses] = useState<ExportStatusType[]>([]);
  const [exportResult, setExportResult] = useState<any>(null);
  const [exportReport, setExportReport] = useState<any>(null);
  const [showEnhancementDetails, setShowEnhancementDetails] = useState(false);

  useEffect(() => {
    const platforms: ExportStatusType['platform'][] = ['etsy', 'amazon', 'whatsapp'];
    setExportStatuses(platforms.map(p => ({ platform: p, status: 'queued' })));

    const exportAll = async () => {
      try {
        // Set all platforms to processing
        setExportStatuses(prev => prev.map(s => ({ ...s, status: 'processing' })));
        
        // Export to all platforms with conversation enhancement
        const result = await exportToMarketplace(
          listing, 
          platforms, 
          {}, // userPreferences
          conversationData,
          userProfile
        );
        
        setExportResult(result);
        
        // Update statuses based on results
        if (result.success && result.results) {
          setExportStatuses(prev => prev.map(s => ({
            ...s,
            status: result.results[s.platform]?.success ? 'success' : 'failed',
            timestamp: new Date(),
            enhancedFeatures: result.results[s.platform]?.enhancedFeatures || {}
          })));
          
          // Generate conversation export report if conversation data is available
          if (conversationData && result.exportId) {
            try {
              const report = await generateConversationExportReport(
                result.exportId,
                conversationData,
                userProfile
              );
              setExportReport(report.report);
            } catch (reportError) {
              console.error('Failed to generate export report:', reportError);
            }
          }
          
          // Auto-navigate to dashboard after all exports complete
          setTimeout(() => {
            onComplete();
          }, 4000);
        } else {
          // Handle general failure
          setExportStatuses(prev => prev.map(s => ({
            ...s,
            status: 'failed',
            timestamp: new Date()
          })));
        }
      } catch (error) {
        console.error('Export failed:', error);
        setExportStatuses(prev => prev.map(s => ({
          ...s,
          status: 'failed',
          timestamp: new Date()
        })));
      }
    };

    if (listing) {
      exportAll();
    }
  }, [listing, conversationData, userProfile, onComplete]);

  const handleRetry = async (platform: ExportStatusType['platform']) => {
    setExportStatuses(prev => prev.map(s => s.platform === platform ? { ...s, status: 'processing' } : s));
    try {
      const result = await exportToMarketplace(
        listing, 
        [platform], 
        {}, 
        conversationData,
        userProfile
      );
      
      if (result.success && result.results && result.results[platform]?.success) {
        setExportStatuses(prev => prev.map(s => s.platform === platform ? { 
          ...s, 
          status: 'success', 
          timestamp: new Date(),
          enhancedFeatures: result.results[platform]?.enhancedFeatures || {}
        } : s));
      } else {
        setExportStatuses(prev => prev.map(s => s.platform === platform ? { ...s, status: 'failed', timestamp: new Date() } : s));
      }
    } catch (error) {
      setExportStatuses(prev => prev.map(s => s.platform === platform ? { ...s, status: 'failed', timestamp: new Date() } : s));
    }
  };

  const getStatusChip = (status: ExportStatusType['status']) => {
    const baseClasses = "text-xs font-medium py-1 px-2 rounded-full flex items-center gap-1";
    
    switch (status) {
      case 'queued':
        return (
          <div className={`${baseClasses} bg-queued-bg text-queued-text`}>
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>Queued</span>
          </div>
        );
      case 'processing':
        return (
          <div className={`${baseClasses} bg-processing-bg text-processing-text`}>
            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
            </svg>
            <span>Processing</span>
          </div>
        );
      case 'success':
        return (
          <div className={`${baseClasses} bg-success-bg text-success-text`}>
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>Success</span>
          </div>
        );
      case 'failed':
        return (
          <div className={`${baseClasses} bg-failed-bg text-failed-text`}>
            <span className="material-symbols-outlined text-sm">error</span>
            <span>Failed</span>
          </div>
        );
    }
  };

  const getPlatformIcon = (platform: string) => {
    const iconClasses = "flex items-center justify-center size-8 rounded-full text-white";
    
    switch (platform) {
      case 'etsy':
        return (
          <div className={`${iconClasses} bg-etsy`}>
            <svg fill="currentColor" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 6.75h9v1.5h-9v-1.5zm0 3h9v1.5h-9v-1.5zm0 3h6v1.5h-6v-1.5z"/>
            </svg>
          </div>
        );
      case 'amazon':
        return (
          <div className={`${iconClasses} bg-primary-text`}>
            <svg fill="currentColor" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.42 12.44a4.42 4.42 0 0 0-4.09-4.2h-3.32a.45.45 0 0 1-.45-.44V4.18a.45.45 0 0 1 .45-.44h5.66a.45.45 0 0 0 .45-.44V1.45a.45.45 0 0 0-.45-.44H10.1a.45.45 0 0 0-.45.44v9.82a.45.45 0 0 0 .45.44h4a.45.45 0 0 1 .44.4v2.75a.45.45 0 0 1-.44.44h-2.1a.45.45 0 0 0-.45-.44v1.85a.45.45 0 0 0 .45.44h3a4.5 4.5 0 0 0 4.37-4.59v-.05Z"/>
            </svg>
          </div>
        );
      case 'whatsapp':
        return (
          <div className={`${iconClasses} bg-whatsapp`}>
            <svg fill="currentColor" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2z"/>
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-background-main">
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      <button 
        className="absolute top-4 left-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-background-main/80 backdrop-blur-sm hover:bg-background-light transition-colors shadow-sm"
        onClick={onBack}
      >
        <span className="material-symbols-outlined text-primary-text text-lg">arrow_back</span>
      </button>
      
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-lg pt-8">
          <div className="space-y-md text-center">
            <h1 className="text-primary-text text-2xl font-bold leading-tight">Export & Status</h1>
          </div>
        </div>
        
        <div className="px-lg py-8">
        
        <div className="p-md space-y-sm">
          <div className="text-center mb-md">
            <h2 className="text-base font-semibold text-primary-text mb-sm">Exporting Your Listings</h2>
            <p className="text-xs text-secondary-text">
              {conversationData ? 
                'Your products are being published with conversation enhancements...' : 
                'Your products are being published to marketplaces...'
              }
            </p>
            {exportResult?.conversationEnhanced && (
              <div className="mt-sm bg-primary-brand/10 border border-primary-brand/20 rounded-lg p-sm">
                <div className="flex items-center justify-center gap-xs mb-xs">
                  <span className="material-symbols-outlined text-primary-brand text-sm">auto_awesome</span>
                  <span className="text-xs font-medium text-primary-brand">Conversation Enhanced</span>
                </div>
                <p className="text-xs text-primary-brand/80">
                  Using {exportResult.enhancementMetrics?.totalConversationTurns || 0} conversation turns and {exportResult.enhancementMetrics?.extractedFieldsCount || 0} extracted details
                </p>
              </div>
            )}
          </div>
          
          {exportStatuses.map((exportStatus, index) => (
            <div key={`${exportStatus.platform}-${index}`} className="bg-background-light rounded-xl shadow-sm p-sm">
              <div className="flex items-center justify-between gap-sm">
                <div className="flex items-center gap-sm">
                  {getPlatformIcon(exportStatus.platform)}
                  <div>
                    <p className="text-base font-bold text-primary-text capitalize">{exportStatus.platform}</p>
                    {exportStatus.enhancedFeatures?.conversationEnhanced && (
                      <div className="flex items-center gap-xs mt-xs">
                        <span className="material-symbols-outlined text-primary-brand text-xs">auto_awesome</span>
                        <span className="text-xs text-primary-brand">Enhanced with conversation</span>
                      </div>
                    )}
                  </div>
                </div>
                {getStatusChip(exportStatus.status)}
              </div>
              
              {exportStatus.status === 'success' && exportStatus.enhancedFeatures && (
                <div className="mt-sm">
                  <button 
                    className="text-xs text-primary-brand hover:text-primary-brand/80 flex items-center gap-xs"
                    onClick={() => setShowEnhancementDetails(!showEnhancementDetails)}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showEnhancementDetails ? 'expand_less' : 'expand_more'}
                    </span>
                    View Enhancement Details
                  </button>
                  
                  {showEnhancementDetails && (
                    <div className="mt-sm p-sm bg-background-main rounded-lg border border-border-color">
                      <div className="grid grid-cols-2 gap-sm text-xs">
                        {exportStatus.platform === 'etsy' && exportStatus.enhancedFeatures && (
                          <>
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs text-success-text">check</span>
                              <span>Story Elements: {exportStatus.enhancedFeatures.storyElements || 0}</span>
                            </div>
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs text-success-text">check</span>
                              <span>Cultural Tags: {exportStatus.enhancedFeatures.culturalTags || 0}</span>
                            </div>
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs text-success-text">check</span>
                              <span>Artisan Story: {exportStatus.enhancedFeatures.artisanStoryIncluded ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs text-success-text">check</span>
                              <span>Cultural Context: {exportStatus.enhancedFeatures.culturalContextIncluded ? 'Yes' : 'No'}</span>
                            </div>
                          </>
                        )}
                        
                        {exportStatus.platform === 'amazon' && exportStatus.enhancedFeatures && (
                          <>
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs text-success-text">check</span>
                              <span>Quality Indicators: {exportStatus.enhancedFeatures.qualityIndicators || 0}</span>
                            </div>
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs text-success-text">check</span>
                              <span>Tech Specs: {exportStatus.enhancedFeatures.technicalSpecs || 0}</span>
                            </div>
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs text-success-text">check</span>
                              <span>Product Attributes: {exportStatus.enhancedFeatures.productAttributes || 0}</span>
                            </div>
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs text-success-text">check</span>
                              <span>Target Optimized: {exportStatus.enhancedFeatures.targetAudienceOptimized ? 'Yes' : 'No'}</span>
                            </div>
                          </>
                        )}
                        
                        {exportStatus.platform === 'whatsapp' && exportStatus.enhancedFeatures && (
                          <>
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs text-success-text">check</span>
                              <span>Personal Message: {exportStatus.enhancedFeatures.personalizedMessage ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs text-success-text">check</span>
                              <span>Artisan Story: {exportStatus.enhancedFeatures.artisanStory ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs text-success-text">check</span>
                              <span>Message Options: {exportStatus.enhancedFeatures.multipleMessageOptions || 0}</span>
                            </div>
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-xs text-success-text">check</span>
                              <span>Customization Info: {exportStatus.enhancedFeatures.customizationOptionsIncluded ? 'Yes' : 'No'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {exportStatus.status === 'failed' && (
                <button 
                  className="flex w-full items-center justify-center gap-sm rounded-lg border border-error py-2 text-xs font-bold text-error hover:bg-failed-bg transition-colors mt-sm"
                  onClick={() => handleRetry(exportStatus.platform)}
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  <span>Retry Export</span>
                </button>
              )}
            </div>
          ))}
          
          {exportReport && (
            <div className="mt-md bg-background-light rounded-xl shadow-sm p-sm">
              <h3 className="text-sm font-semibold text-primary-text mb-sm flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary-brand">insights</span>
                Conversation Export Report
              </h3>
              
              <div className="space-y-sm">
                {exportReport.conversationEnhancements && (
                  <div className="bg-primary-brand/5 rounded-lg p-sm">
                    <h4 className="text-xs font-medium text-primary-text mb-xs">Conversation Data Used</h4>
                    <div className="grid grid-cols-2 gap-xs text-xs text-secondary-text">
                      <div>Turns: {exportReport.conversationEnhancements.totalTurns}</div>
                      <div>Fields: {exportReport.conversationEnhancements.extractedFields}</div>
                      <div>Quality: {Math.round(exportReport.conversationEnhancements.qualityScore * 100)}%</div>
                      <div>Language: {exportReport.conversationEnhancements.conversationLanguage}</div>
                    </div>
                  </div>
                )}
                
                {exportReport.marketplaceOptimizations && (
                  <div className="space-y-xs">
                    <h4 className="text-xs font-medium text-primary-text">Platform Optimization Scores</h4>
                    <div className="space-y-xs">
                      {Object.entries(exportReport.marketplaceOptimizations).map(([platform, optimization]: [string, any]) => (
                        <div key={platform} className="flex items-center justify-between">
                          <span className="text-xs text-secondary-text capitalize">{platform}</span>
                          <div className="flex items-center gap-xs">
                            <div className="w-16 h-1 bg-background-main rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary-brand rounded-full transition-all duration-300"
                                style={{ width: `${(optimization.optimizationScore || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-primary-text font-medium">
                              {Math.round((optimization.optimizationScore || 0) * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {exportReport.recommendations && exportReport.recommendations.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-sm">
                    <h4 className="text-xs font-medium text-amber-800 mb-xs flex items-center gap-xs">
                      <span className="material-symbols-outlined text-xs">lightbulb</span>
                      Recommendations
                    </h4>
                    <ul className="space-y-xs">
                      {exportReport.recommendations.slice(0, 2).map((rec: string, index: number) => (
                        <li key={index} className="text-xs text-amber-700 flex items-start gap-xs">
                          <span className="material-symbols-outlined text-xs mt-0.5">arrow_right</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-lg text-center">
            <div className="bg-success-bg border border-green-200 rounded-lg p-sm">
              <div className="flex items-center justify-center mb-sm">
                <span className="material-symbols-outlined text-success-text text-xl">check_circle</span>
              </div>
              <p className="text-success-text font-medium text-sm">
                {conversationData ? 'Enhanced Exports Complete!' : 'Exports Complete!'}
              </p>
              <p className="text-success-text text-xs mt-xs">
                {conversationData ? 
                  'Your listings have been enhanced with conversation insights!' : 
                  'Redirecting to your products dashboard...'
                }
              </p>
              {exportResult?.enhancementMetrics && (
                <div className="mt-sm text-xs text-success-text/80">
                  Conversation richness: {Math.round((exportResult.enhancementMetrics.conversationRichnessScore || 0) * 100)}%
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
      
      <div className="flex-shrink-0 bg-background-main/80 backdrop-blur-sm border-t border-border-color">
        <div className="p-md pb-lg">
          <button 
            className="btn-primary"
            onClick={onComplete}
          >
            <span className="material-symbols-outlined text-xl mr-2">home</span>
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportStatus;