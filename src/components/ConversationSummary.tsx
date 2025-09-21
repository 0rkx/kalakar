import React, { useState, useEffect } from 'react';
import { ProductInfo } from '../types';
import { firebaseService } from '../services/firebase-service';

interface ExtractedProductInfo extends ProductInfo {
  confidence: {
    overall: number;
    fields: Record<string, number>;
  };
  missingFields: string[];
  requiredFieldsComplete: boolean;
}

interface ConversationSummaryProps {
  conversationId: string;
  productInfo?: ProductInfo;
  onConfirm: (extractedInfo: ExtractedProductInfo) => void;
  onEdit: (field: string) => void;
  onContinueConversation: () => void;
}

const ConversationSummary: React.FC<ConversationSummaryProps> = ({
  conversationId,
  productInfo,
  onConfirm,
  onEdit,
  onContinueConversation
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));
  const [extractedInfo, setExtractedInfo] = useState<ExtractedProductInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract product information when component mounts
  useEffect(() => {
    const extractProductInformation = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const result = await firebaseService.extractProductInformation(conversationId);
        setExtractedInfo(result.extractedInfo);
      } catch (err) {
        console.error('Error extracting product information:', err);
        setError('Failed to extract product information. Please try again.');
        
        // Fallback to provided productInfo if available
        if (productInfo) {
          setExtractedInfo({
            ...productInfo,
            confidence: {
              overall: 0.5,
              fields: {}
            },
            missingFields: [],
            requiredFieldsComplete: false
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    extractProductInformation();
  }, [conversationId, productInfo]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const renderField = (label: string, value: any, fieldKey: string, isRequired = false) => {
    const isEmpty = !value || (Array.isArray(value) && value.length === 0) || value === '';
    const confidence = extractedInfo?.confidence?.fields?.[fieldKey] || 0;
    const isLowConfidence = confidence < 0.5;
    const isMissing = extractedInfo?.missingFields?.includes(fieldKey);
    
    return (
      <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-b-0">
        <div className="flex-1">
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {isRequired && isEmpty && (
              <span className="ml-2 text-xs text-red-500 bg-red-50 px-2 py-1 rounded">Required</span>
            )}
            {isMissing && (
              <span className="ml-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">Missing</span>
            )}
            {!isEmpty && confidence > 0 && (
              <div className="ml-2 flex items-center">
                <div className={`w-2 h-2 rounded-full ${
                  confidence >= 0.8 ? 'bg-green-500' : 
                  confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="ml-1 text-xs text-gray-500">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            )}
          </div>
          <div className="mt-1">
            {isEmpty ? (
              <span className="text-sm text-gray-400 italic">Not provided</span>
            ) : Array.isArray(value) ? (
              <div className="flex flex-wrap gap-1">
                {value.map((item, index) => (
                  <span key={index} className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                    {item}
                  </span>
                ))}
              </div>
            ) : typeof value === 'object' ? (
              <div className="text-sm text-gray-600">
                {Object.entries(value).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key}:</span>
                    <span>{String(val)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm text-gray-600">{String(value)}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => onEdit(fieldKey)}
          className="ml-3 text-orange-600 hover:text-orange-800 text-sm font-medium"
        >
          Edit
        </button>
      </div>
    );
  };

  const renderSection = (title: string, sectionKey: string, children: React.ReactNode, itemCount?: number) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <h3 className="font-semibold text-gray-800">{title}</h3>
            {itemCount !== undefined && (
              <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {itemCount} items
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100">
            {children}
          </div>
        )}
      </div>
    );
  };

  const getCompletionPercentage = () => {
    if (!extractedInfo) return 0;
    
    const requiredFields = ['productType', 'materials', 'colors', 'craftingProcess'];
    const allFields = [
      'productType', 'materials', 'colors', 'craftingProcess',
      'culturalSignificance', 'pricing', 'uniqueFeatures', 'timeToMake'
    ];
    
    const completedFields = allFields.filter(field => {
      const confidence = extractedInfo.confidence?.fields?.[field] || 0;
      return confidence >= 0.3; // Consider field completed if confidence >= 30%
    }).length;
    
    return Math.round((completedFields / allFields.length) * 100);
  };

  const getRequiredFieldsStatus = () => {
    if (!extractedInfo) return { completed: 0, total: 4 };
    
    const requiredFields = ['productType', 'materials', 'colors', 'craftingProcess'];
    const completed = requiredFields.filter(field => {
      const confidence = extractedInfo.confidence?.fields?.[field] || 0;
      return confidence >= 0.5; // Higher threshold for required fields
    }).length;
    
    return { completed, total: requiredFields.length };
  };

  const completionPercentage = getCompletionPercentage();
  const requiredStatus = getRequiredFieldsStatus();

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-orange-50 to-red-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Analyzing Your Conversation</h3>
            <p className="text-gray-600">I'm extracting product information from our conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-orange-50 to-red-50">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Analysis Failed</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onContinueConversation}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Continue Conversation
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!extractedInfo) {
    return null;
  }

  const currentProductInfo = extractedInfo;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Review Your Product Information</h2>
          <p className="text-gray-600 text-sm mb-3">
            I've analyzed our conversation and extracted this information. Please review and confirm.
          </p>
          
          {/* Overall confidence indicator */}
          <div className="mb-3">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-sm text-gray-600">Overall Confidence:</span>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                extractedInfo.confidence.overall >= 0.8 ? 'bg-green-100 text-green-800' :
                extractedInfo.confidence.overall >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {Math.round(extractedInfo.confidence.overall * 100)}%
              </div>
            </div>
          </div>
          
          {/* Completion indicators */}
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-sm text-gray-600">Information Completeness:</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-700">{completionPercentage}%</span>
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <span className="text-sm text-gray-600">Required Fields:</span>
              <span className={`text-sm font-medium ${
                requiredStatus.completed === requiredStatus.total ? 'text-green-600' : 'text-red-600'
              }`}>
                {requiredStatus.completed}/{requiredStatus.total}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Basic Information */}
        {renderSection(
          'Basic Information',
          'basic',
          <>
            {renderField('Product Type', currentProductInfo.productType, 'productType', true)}
            {renderField('Materials', currentProductInfo.materials, 'materials', true)}
            {renderField('Colors', currentProductInfo.colors, 'colors', true)}
            {renderField('Dimensions', currentProductInfo.dimensions, 'dimensions')}
          </>,
          4
        )}

        {/* Crafting Details */}
        {renderSection(
          'Crafting Details',
          'crafting',
          <>
            {renderField('Crafting Process', currentProductInfo.craftingProcess, 'craftingProcess', true)}
            {renderField('Time to Make', currentProductInfo.timeToMake, 'timeToMake')}
            {renderField('Cultural Significance', currentProductInfo.culturalSignificance, 'culturalSignificance')}
            {renderField('Unique Features', currentProductInfo.uniqueFeatures, 'uniqueFeatures')}
          </>,
          4
        )}

        {/* Market Information */}
        {renderSection(
          'Market Information',
          'market',
          <>
            {renderField('Pricing', currentProductInfo.pricing, 'pricing')}
            {renderField('Target Market', currentProductInfo.targetMarket, 'targetMarket')}
            {renderField('Care Instructions', currentProductInfo.careInstructions, 'careInstructions')}
            {renderField('Customization Options', currentProductInfo.customizationOptions, 'customizationOptions')}
          </>,
          4
        )}

        {/* Missing fields alert */}
        {extractedInfo.missingFields.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Missing Information
            </h4>
            <p className="text-sm text-yellow-700 mb-2">
              I couldn't extract the following information from our conversation:
            </p>
            <div className="flex flex-wrap gap-2">
              {extractedInfo.missingFields.map((field, index) => (
                <span key={index} className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Summary card */}
        <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-800 mb-2">Quick Summary</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {currentProductInfo.productType && (
              <>
                You've created a beautiful <strong>{currentProductInfo.productType}</strong>
                {currentProductInfo.materials && currentProductInfo.materials.length > 0 && (
                  <> made from <strong>{currentProductInfo.materials.join(', ')}</strong></>
                )}
                {currentProductInfo.colors && currentProductInfo.colors.length > 0 && (
                  <> featuring <strong>{currentProductInfo.colors.join(', ')}</strong> colors</>
                )}
                {currentProductInfo.craftingProcess && (
                  <>. The crafting process involves <strong>{currentProductInfo.craftingProcess}</strong></>
                )}
                {currentProductInfo.culturalSignificance && (
                  <>, with cultural significance in <strong>{currentProductInfo.culturalSignificance}</strong></>
                )}
                .
              </>
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
        {!extractedInfo.requiredFieldsComplete && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center">
              <strong>Required fields are incomplete.</strong> Please continue the conversation to provide missing information.
            </p>
          </div>
        )}
        
        <div className="flex space-x-3">
          <button
            onClick={onContinueConversation}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Continue Conversation
          </button>
          <button
            onClick={() => onConfirm(extractedInfo)}
            disabled={!extractedInfo.requiredFieldsComplete}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium ${
              extractedInfo.requiredFieldsComplete
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {extractedInfo.requiredFieldsComplete ? 'Proceed to Photos' : 'Complete Required Fields'}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 text-center mt-2">
          {extractedInfo.requiredFieldsComplete 
            ? 'You can always come back and edit this information later'
            : 'Required: Product type, materials, colors, and crafting process'
          }
        </p>
      </div>
    </div>
  );
};

export default ConversationSummary;