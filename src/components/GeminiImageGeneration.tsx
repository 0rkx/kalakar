import React, { useState, useRef } from 'react';
import { backendApi, GeneratedImage, EditedImage, MarketingImage } from '../services/backendApi';

interface GeminiImageGenerationProps {
  sessionId: string;
  knowledgeId?: string;
  onImagesGenerated?: (images: GeneratedImage[]) => void;
  onImagesEdited?: (images: EditedImage[]) => void;
  onMarketingImagesGenerated?: (images: MarketingImage[]) => void;
}

type TabType = 'generate' | 'edit' | 'marketing';
type StyleType = 'photorealistic' | 'lifestyle' | 'artistic' | 'minimalist';

const GeminiImageGeneration: React.FC<GeminiImageGenerationProps> = ({
  sessionId,
  knowledgeId,
  onImagesGenerated,
  onImagesEdited,
  onMarketingImagesGenerated
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [editedImages, setEditedImages] = useState<EditedImage[]>([]);
  const [marketingImages, setMarketingImages] = useState<MarketingImage[]>([]);
  
  // Generation state
  const [prompts, setPrompts] = useState<string[]>(['']);
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('photorealistic');
  
  // Editing state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editPrompts, setEditPrompts] = useState<string[]>(['']);
  
  // Marketing state
  const [selectedImageTypes, setSelectedImageTypes] = useState<string[]>(['product', 'lifestyle']);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addPrompt = () => {
    setPrompts([...prompts, '']);
  };

  const updatePrompt = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const removePrompt = (index: number) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter((_, i) => i !== index));
    }
  };

  const addEditPrompt = () => {
    setEditPrompts([...editPrompts, '']);
  };

  const updateEditPrompt = (index: number, value: string) => {
    const newPrompts = [...editPrompts];
    newPrompts[index] = value;
    setEditPrompts(newPrompts);
  };

  const removeEditPrompt = (index: number) => {
    if (editPrompts.length > 1) {
      setEditPrompts(editPrompts.filter((_, i) => i !== index));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleGenerateImages = async () => {
    if (prompts.some(p => p.trim())) {
      setIsGenerating(true);
      try {
        const validPrompts = prompts.filter(p => p.trim());
        const response = await backendApi.generateProductImages({
          sessionId,
          knowledgeId,
          prompts: validPrompts,
          style: selectedStyle
        });

        if (response.success) {
          setGeneratedImages(response.generatedImages);
          onImagesGenerated?.(response.generatedImages);
        }
      } catch (error) {
        console.error('Image generation failed:', error);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleEditImages = async () => {
    if (selectedFiles.length > 0 && editPrompts.some(p => p.trim())) {
      setIsGenerating(true);
      try {
        const validPrompts = editPrompts.filter(p => p.trim());
        const response = await backendApi.editProductImages({
          sessionId,
          knowledgeId,
          images: selectedFiles,
          editPrompts: validPrompts
        });

        if (response.success) {
          setEditedImages(response.editedImages);
          onImagesEdited?.(response.editedImages);
        }
      } catch (error) {
        console.error('Image editing failed:', error);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleGenerateMarketingImages = async () => {
    if (knowledgeId && selectedImageTypes.length > 0) {
      setIsGenerating(true);
      try {
        const response = await backendApi.generateMarketingImages({
          sessionId,
          knowledgeId,
          imageTypes: selectedImageTypes
        });

        if (response.success) {
          setMarketingImages(response.marketingImages);
          onMarketingImagesGenerated?.(response.marketingImages);
        }
      } catch (error) {
        console.error('Marketing image generation failed:', error);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const toggleImageType = (type: string) => {
    setSelectedImageTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const downloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-xl">🎨</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gemini 2.5 Flash Image Generation</h2>
          <p className="text-gray-600">Create, edit, and enhance product images with AI</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'generate'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Generate Images
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'edit'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Edit Images
        </button>
        <button
          onClick={() => setActiveTab('marketing')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'marketing'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          disabled={!knowledgeId}
        >
          Marketing Images
        </button>
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Style
            </label>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value as StyleType)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="photorealistic">Photorealistic (E-commerce)</option>
              <option value="lifestyle">Lifestyle (In-use)</option>
              <option value="artistic">Artistic (Creative)</option>
              <option value="minimalist">Minimalist (Clean)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image Prompts
            </label>
            {prompts.map((prompt, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <textarea
                  value={prompt}
                  onChange={(e) => updatePrompt(index, e.target.value)}
                  placeholder="Describe the image you want to generate..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={2}
                />
                {prompts.length > 1 && (
                  <button
                    onClick={() => removePrompt(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addPrompt}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              + Add Another Prompt
            </button>
          </div>

          <button
            onClick={handleGenerateImages}
            disabled={isGenerating || !prompts.some(p => p.trim())}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? 'Generating Images...' : 'Generate Images with Gemini'}
          </button>

          {/* Generated Images Display */}
          {generatedImages.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Images</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedImages.map((image, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={image.imageUrl}
                      alt={`Generated ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-3">
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {image.originalPrompt}
                      </p>
                      <button
                        onClick={() => downloadImage(image.imageUrl!, `generated-image-${index + 1}.png`)}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Tab */}
      {activeTab === 'edit' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Images to Edit
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {selectedFiles.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {selectedFiles.length} file(s) selected
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Edit Instructions
            </label>
            {editPrompts.map((prompt, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <textarea
                  value={prompt}
                  onChange={(e) => updateEditPrompt(index, e.target.value)}
                  placeholder="Describe how you want to edit the image..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={2}
                />
                {editPrompts.length > 1 && (
                  <button
                    onClick={() => removeEditPrompt(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addEditPrompt}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              + Add Another Edit Instruction
            </button>
          </div>

          <button
            onClick={handleEditImages}
            disabled={isGenerating || selectedFiles.length === 0 || !editPrompts.some(p => p.trim())}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? 'Editing Images...' : 'Edit Images with Gemini'}
          </button>

          {/* Edited Images Display */}
          {editedImages.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edited Images</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {editedImages.map((image, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={image.imageUrl}
                      alt={`Edited ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-3">
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {image.editPrompt}
                      </p>
                      <button
                        onClick={() => downloadImage(image.imageUrl!, `edited-image-${index + 1}.png`)}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Marketing Tab */}
      {activeTab === 'marketing' && (
        <div className="space-y-6">
          {!knowledgeId ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Knowledge base required for marketing image generation</p>
              <p className="text-sm text-gray-400 mt-2">Complete a conversation first to build product knowledge</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Image Types to Generate
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'product', label: 'Product Shot', desc: 'Clean product photography' },
                    { id: 'lifestyle', label: 'Lifestyle', desc: 'Product in use/context' },
                    { id: 'detail', label: 'Detail Shot', desc: 'Close-up craftsmanship' },
                    { id: 'cultural', label: 'Cultural', desc: 'Heritage and tradition' }
                  ].map((type) => (
                    <label key={type.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedImageTypes.includes(type.id)}
                        onChange={() => toggleImageType(type.id)}
                        className="mt-1 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-sm text-gray-500">{type.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateMarketingImages}
                disabled={isGenerating || selectedImageTypes.length === 0}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isGenerating ? 'Generating Marketing Images...' : 'Generate Marketing Images'}
              </button>

              {/* Marketing Images Display */}
              {marketingImages.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketing Images</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {marketingImages.map((image, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={image.imageUrl}
                          alt={`${image.type} image`}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-purple-600 capitalize">
                              {image.type} Image
                            </span>
                            <button
                              onClick={() => downloadImage(image.imageUrl!, `${image.type}-image.png`)}
                              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                            >
                              Download
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {image.prompt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GeminiImageGeneration;