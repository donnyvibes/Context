// iOS Native Components for ContextOS
import React, { useRef, useEffect } from 'react';
import iosNative from '../utils/iosNative';

export const CategoryFilter = ({ categories, selectedCategory, onSelectCategory }) => (
  <div className="flex space-x-2 overflow-x-auto pb-2 mb-4 ios-smooth-scroll">
    <button
      onClick={() => {
        iosNative.hapticFeedback('light');
        onSelectCategory('');
      }}
      className={`px-4 py-2 rounded-full whitespace-nowrap ios-callout font-medium transition-all duration-200 ios-touch-optimized ${
        selectedCategory === '' 
          ? 'bg-ios-blue text-white shadow-sm' 
          : 'bg-ios-gray6 text-ios-blue hover:bg-ios-gray5'
      }`}
    >
      All
    </button>
    {categories.map(category => (
      <button
        key={category.id}
        onClick={() => {
          iosNative.hapticFeedback('light');
          onSelectCategory(category.id);
        }}
        className={`px-4 py-2 rounded-full whitespace-nowrap ios-callout font-medium transition-all duration-200 ios-touch-optimized ${
          selectedCategory === category.id 
            ? 'bg-ios-blue text-white shadow-sm' 
            : 'bg-ios-gray6 text-ios-blue hover:bg-ios-gray5'
        }`}
      >
        {category.name}
      </button>
    ))}
  </div>
);

export const SearchBar = ({ searchQuery, onSearchChange }) => (
  <div className="mb-4">
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="w-5 h-5 text-ios-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        placeholder="Search prompts..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="ios-input pl-10"
      />
    </div>
  </div>
);

export const PromptCard = ({ prompt, categories, onEdit, onDelete, onGenerate }) => {
  const cardRef = useRef(null);
  const category = categories.find(cat => cat.id === prompt.category);
  
  useEffect(() => {
    if (cardRef.current) {
      iosNative.initializeSwipeGestures(cardRef.current, {
        swipeLeft: () => {
          iosNative.hapticFeedback('medium');
          onDelete(prompt.id);
        }
      });
    }
  }, [prompt.id, onDelete]);

  const handleShare = async () => {
    iosNative.hapticFeedback('light');
    
    const shareData = {
      title: prompt.title,
      text: prompt.content,
      url: window.location.href
    };

    const shared = await iosNative.share(shareData);
    if (shared) {
      iosNative.showIOSToast('Prompt shared successfully!');
    }
  };

  return (
    <div 
      ref={cardRef}
      className="ios-card hover:shadow-md transition-all duration-300 ios-touch-optimized relative"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="ios-headline text-gray-900 truncate flex-1">
          {prompt.title}
        </h3>
        <div className="flex space-x-2 ml-2">
          <button
            onClick={() => {
              iosNative.hapticFeedback('light');
              handleShare();
            }}
            className="text-ios-blue hover:text-ios-blue-dark ios-footnote ios-touch-optimized"
          >
            Share
          </button>
          <button
            onClick={() => {
              iosNative.hapticFeedback('light');
              onEdit(prompt);
            }}
            className="text-ios-blue hover:text-ios-blue-dark ios-footnote ios-touch-optimized"
          >
            Edit
          </button>
          <button
            onClick={() => {
              iosNative.hapticFeedback('medium');
              onDelete(prompt.id);
            }}
            className="text-ios-red hover:text-red-700 ios-footnote ios-touch-optimized"
          >
            Delete
          </button>
        </div>
      </div>
      
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="inline-block bg-ios-blue/10 text-ios-blue ios-footnote px-2 py-1 rounded-full">
          {category?.name || 'General'}
        </span>
        {prompt.variables.length > 0 && (
          <span className="inline-block bg-ios-green/10 text-ios-green ios-footnote px-2 py-1 rounded-full">
            {prompt.variables.length} variables
          </span>
        )}
      </div>
      
      <p className="ios-body text-gray-600 mb-4 line-clamp-3">
        {prompt.content}
      </p>
      
      {prompt.variables.length > 0 && (
        <button
          onClick={() => {
            iosNative.hapticFeedback('medium');
            onGenerate(prompt);
          }}
          className="ios-btn-secondary ios-callout w-full ios-touch-optimized"
        >
          Generate with Variables
        </button>
      )}
    </div>
  );
};

export const CreatePromptModal = ({ isOpen, onClose, onSubmit, categories, editingPrompt }) => {
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [category, setCategory] = React.useState('general');

  React.useEffect(() => {
    if (editingPrompt) {
      setTitle(editingPrompt.title);
      setContent(editingPrompt.content);
      setCategory(editingPrompt.category);
    } else {
      setTitle('');
      setContent('');
      setCategory('general');
    }
  }, [editingPrompt, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    iosNative.hapticFeedback('success');
    onSubmit({ title, content, category });
    setTitle('');
    setContent('');
    setCategory('general');
  };

  const handleClose = () => {
    iosNative.hapticFeedback('light');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="ios-modal-overlay" onClick={handleClose}>
      <div className="ios-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="ios-title2">
            {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 ios-touch-optimized p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block ios-callout font-medium text-gray-700 mb-3">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="ios-input"
              required
              placeholder="Enter prompt title"
            />
          </div>
          
          <div>
            <label className="block ios-callout font-medium text-gray-700 mb-3">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="ios-input"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block ios-callout font-medium text-gray-700 mb-3">
              Prompt Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="ios-textarea"
              placeholder="Enter your prompt here. Use {{variable_name}} for dynamic placeholders."
              required
            />
            <p className="ios-footnote text-gray-500 mt-2">
              Use {'{{variable_name}}'} for dynamic placeholders
            </p>
          </div>
          
          <div className="flex space-x-3 pt-6">
            <button
              type="submit"
              className="ios-btn-primary flex-1 ios-touch-optimized"
            >
              {editingPrompt ? 'Update' : 'Create'} Prompt
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="ios-btn-secondary flex-1 ios-touch-optimized"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const GenerateModal = ({ isOpen, onClose, prompt, onGenerate }) => {
  const [variables, setVariables] = React.useState({});
  const [generatedContent, setGeneratedContent] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    if (prompt && isOpen) {
      const initialVars = {};
      prompt.variables.forEach(varName => {
        initialVars[varName] = '';
      });
      setVariables(initialVars);
      setGeneratedContent('');
    }
  }, [prompt, isOpen]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    iosNative.hapticFeedback('medium');
    
    const loadingIndicator = iosNative.showActivityIndicator('Generating content...');
    
    try {
      // Simulate API call delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const ApiService = window.ApiService; // Access from global scope
      const result = await ApiService.post(`/api/prompts/${prompt.id}/generate`, variables);
      setGeneratedContent(result.generated_content);
      iosNative.hapticFeedback('success');
      iosNative.showIOSToast('Content generated successfully!');
    } catch (error) {
      iosNative.hapticFeedback('error');
      iosNative.showIOSToast('Error generating content');
    } finally {
      setIsGenerating(false);
      loadingIndicator.hide();
    }
  };

  const handleCopyToClipboard = async () => {
    const copied = await iosNative.copyToClipboard(generatedContent);
    if (copied) {
      iosNative.hapticFeedback('success');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Generated: ${prompt.title}`,
      text: generatedContent,
      url: window.location.href
    };

    await iosNative.share(shareData);
  };

  const handleClose = () => {
    iosNative.hapticFeedback('light');
    onClose();
  };

  if (!isOpen || !prompt) return null;

  return (
    <div className="ios-modal-overlay" onClick={handleClose}>
      <div className="ios-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="ios-title2">Generate from Template</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 ios-touch-optimized p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          <h3 className="ios-headline text-gray-900 mb-2">{prompt.title}</h3>
          <p className="ios-body text-gray-600 mb-4">{prompt.content}</p>
        </div>
        
        <div className="space-y-4">
          {prompt.variables.map(varName => (
            <div key={varName}>
              <label className="block ios-callout font-medium text-gray-700 mb-2">
                {varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
              <input
                type="text"
                value={variables[varName] || ''}
                onChange={(e) => setVariables({...variables, [varName]: e.target.value})}
                className="ios-input"
                placeholder={`Enter ${varName}`}
              />
            </div>
          ))}
          
          <button
            onClick={handleGenerate}
            className={`ios-btn-primary w-full ios-touch-optimized ${isGenerating ? 'opacity-50' : ''}`}
            disabled={Object.values(variables).some(val => !val.trim()) || isGenerating}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center">
                <div className="ios-activity-indicator mr-2"></div>
                Generating...
              </div>
            ) : (
              'Generate Content'
            )}
          </button>
          
          {generatedContent && (
            <div className="mt-6">
              <label className="block ios-callout font-medium text-gray-700 mb-2">
                Generated Content
              </label>
              <textarea
                value={generatedContent}
                readOnly
                rows={6}
                className="ios-textarea bg-ios-gray6"
              />
              <div className="flex space-x-3 mt-3">
                <button
                  onClick={handleCopyToClipboard}
                  className="ios-btn-secondary flex-1 ios-touch-optimized"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={handleShare}
                  className="ios-btn-secondary flex-1 ios-touch-optimized"
                >
                  Share
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};