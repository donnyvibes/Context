import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import iosNative from './utils/iosNative';
import { CategoryFilter, SearchBar, PromptCard, CreatePromptModal, GenerateModal } from './components/IOSComponents';
import './App.css';
import './styles/ios-native.css';

// API Configuration
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const AUTH_URL = process.env.REACT_APP_AUTH_URL || 'https://auth.emergentagent.com';

// API Service
class ApiService {
  static async request(endpoint, options = {}) {
    const sessionToken = Cookies.get('session_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(sessionToken && { 'X-Session-ID': sessionToken }),
      ...options.headers
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      Cookies.remove('session_token');
      window.location.reload();
      return;
    }

    return response.json();
  }

  static async get(endpoint) {
    return this.request(endpoint);
  }

  static async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
}

// Components
const LoginPage = ({ onLogin }) => {
  const handleLogin = () => {
    // Add haptic feedback for iOS
    iosNative.hapticFeedback('medium');
    
    const currentUrl = window.location.origin;
    window.location.href = `${AUTH_URL}?redirect=${encodeURIComponent(currentUrl)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 ios-safe-area">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="ios-large-title text-gray-900 mb-2">ContextOS</h1>
          <p className="ios-title2 text-gray-600 mb-8">
            Your AI Prompt Manager
          </p>
          <p className="ios-body text-gray-500 mb-8">
            Organize, search, and template your AI prompts like a pro
          </p>
        </div>
        
        <div className="ios-card-large">
          <button
            onClick={handleLogin}
            className="ios-btn-primary w-full text-lg py-4 ios-haptic-medium"
          >
            Login to Get Started
          </button>
          
          <p className="ios-footnote text-gray-500 mt-4 text-center">
            By signing in, you agree to our terms of service
          </p>
        </div>
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen ios-safe-area">
    <div className="ios-activity-indicator"></div>
    <span className="ml-2 ios-body text-gray-600">Loading...</span>
  </div>
);

const Header = ({ user, onLogout, onShowCreate }) => (
  <header className="ios-nav-bar border-b border-gray-200 sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center">
          <h1 className="ios-title2 text-gray-900">ContextOS</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              iosNative.hapticFeedback('light');
              onShowCreate();
            }}
            className="ios-btn-primary text-sm py-2 px-4"
          >
            + New Prompt
          </button>
          <div className="flex items-center space-x-2">
            <img 
              src={user.picture} 
              alt={user.name}
              className="w-8 h-8 rounded-full"
            />
            <button
              onClick={() => {
                iosNative.hapticFeedback('medium');
                onLogout();
              }}
              className="ios-callout text-gray-600 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
);

const CategoryFilter = ({ categories, selectedCategory, onSelectCategory }) => (
  <div className="flex space-x-2 overflow-x-auto pb-2 mb-4">
    <button
      onClick={() => onSelectCategory('')}
      className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
        selectedCategory === '' 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      All
    </button>
    {categories.map(category => (
      <button
        key={category.id}
        onClick={() => onSelectCategory(category.id)}
        className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
          selectedCategory === category.id 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {category.name}
      </button>
    ))}
  </div>
);

const SearchBar = ({ searchQuery, onSearchChange }) => (
  <div className="mb-4">
    <input
      type="text"
      placeholder="Search prompts..."
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      className="input"
    />
  </div>
);

const PromptCard = ({ prompt, categories, onEdit, onDelete, onGenerate }) => {
  const category = categories.find(cat => cat.id === prompt.category);
  
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
          {prompt.title}
        </h3>
        <div className="flex space-x-2 ml-2">
          <button
            onClick={() => onEdit(prompt)}
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(prompt.id)}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Delete
          </button>
        </div>
      </div>
      
      <div className="mb-3">
        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
          {category?.name || 'General'}
        </span>
        {prompt.variables.length > 0 && (
          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2">
            {prompt.variables.length} variables
          </span>
        )}
      </div>
      
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {prompt.content}
      </p>
      
      {prompt.variables.length > 0 && (
        <button
          onClick={() => onGenerate(prompt)}
          className="btn-secondary text-sm w-full"
        >
          Generate with Variables
        </button>
      )}
    </div>
  );
};

const CreatePromptModal = ({ isOpen, onClose, onSubmit, categories, editingPrompt }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');

  useEffect(() => {
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
    onSubmit({ title, content, category });
    setTitle('');
    setContent('');
    setCategory('general');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="textarea"
                placeholder="Enter your prompt here. Use {{variable_name}} for dynamic placeholders."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{{variable_name}}'} for dynamic placeholders
              </p>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="btn-primary flex-1"
              >
                {editingPrompt ? 'Update' : 'Create'} Prompt
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const GenerateModal = ({ isOpen, onClose, prompt, onGenerate }) => {
  const [variables, setVariables] = useState({});
  const [generatedContent, setGeneratedContent] = useState('');

  useEffect(() => {
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
    try {
      const result = await ApiService.post(`/api/prompts/${prompt.id}/generate`, variables);
      setGeneratedContent(result.generated_content);
    } catch (error) {
      alert('Error generating content');
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    alert('Copied to clipboard!');
  };

  if (!isOpen || !prompt) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Generate from Template</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">{prompt.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{prompt.content}</p>
          </div>
          
          <div className="space-y-4">
            {prompt.variables.map(varName => (
              <div key={varName}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
                <input
                  type="text"
                  value={variables[varName] || ''}
                  onChange={(e) => setVariables({...variables, [varName]: e.target.value})}
                  className="input"
                  placeholder={`Enter ${varName}`}
                />
              </div>
            ))}
            
            <button
              onClick={handleGenerate}
              className="btn-primary w-full"
              disabled={Object.values(variables).some(val => !val.trim())}
            >
              Generate Content
            </button>
            
            {generatedContent && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generated Content
                </label>
                <textarea
                  value={generatedContent}
                  readOnly
                  rows={6}
                  className="textarea bg-gray-50"
                />
                <button
                  onClick={handleCopyToClipboard}
                  className="btn-secondary w-full mt-2"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onLogout }) => {
  const [prompts, setPrompts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [generatingPrompt, setGeneratingPrompt] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [promptsData, categoriesData] = await Promise.all([
        ApiService.get('/api/prompts'),
        ApiService.get('/api/categories')
      ]);
      setPrompts(promptsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPrompts = prompts.filter(prompt => {
    const matchesCategory = !selectedCategory || prompt.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreatePrompt = async (promptData) => {
    try {
      if (editingPrompt) {
        await ApiService.put(`/api/prompts/${editingPrompt.id}`, promptData);
      } else {
        await ApiService.post('/api/prompts', promptData);
      }
      await loadData();
      setShowCreateModal(false);
      setEditingPrompt(null);
    } catch (error) {
      alert('Error saving prompt');
    }
  };

  const handleDeletePrompt = async (promptId) => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        await ApiService.delete(`/api/prompts/${promptId}`);
        await loadData();
      } catch (error) {
        alert('Error deleting prompt');
      }
    }
  };

  const handleEditPrompt = (prompt) => {
    setEditingPrompt(prompt);
    setShowCreateModal(true);
  };

  const handleGeneratePrompt = (prompt) => {
    setGeneratingPrompt(prompt);
    setShowGenerateModal(true);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user} 
        onLogout={onLogout}
        onShowCreate={() => setShowCreateModal(true)}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Prompt Library</h2>
          <p className="text-gray-600">
            Manage and organize your AI prompts efficiently
          </p>
        </div>

        <SearchBar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        
        {filteredPrompts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || selectedCategory ? 'No prompts found' : 'No prompts yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || selectedCategory 
                ? 'Try adjusting your search or category filter'
                : 'Create your first prompt to get started'
              }
            </p>
            {!searchQuery && !selectedCategory && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                Create Your First Prompt
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPrompts.map(prompt => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                categories={categories}
                onEdit={handleEditPrompt}
                onDelete={handleDeletePrompt}
                onGenerate={handleGeneratePrompt}
              />
            ))}
          </div>
        )}
      </main>
      
      <CreatePromptModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingPrompt(null);
        }}
        onSubmit={handleCreatePrompt}
        categories={categories}
        editingPrompt={editingPrompt}
      />
      
      <GenerateModal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          setGeneratingPrompt(null);
        }}
        prompt={generatingPrompt}
        onGenerate={handleGeneratePrompt}
      />
    </div>
  );
};

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for session token in URL (from auth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const fragment = window.location.hash;
    
    if (fragment.includes('session_id=')) {
      const sessionId = fragment.split('session_id=')[1].split('&')[0];
      handleAuthCallback(sessionId);
      return;
    }

    // Check for existing session
    const sessionToken = Cookies.get('session_token');
    if (sessionToken) {
      loadUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthCallback = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/session`, {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        Cookies.set('session_token', data.session_token, { expires: 7 });
        setUser(data.user);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Authentication failed. Please try again.');
    }
    setLoading(false);
  };

  const loadUserProfile = async () => {
    try {
      const userData = await ApiService.get('/api/auth/profile');
      setUser(userData);
    } catch (error) {
      console.error('Profile error:', error);
      Cookies.remove('session_token');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    Cookies.remove('session_token');
    setUser(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="App">
        {user ? (
          <Dashboard user={user} onLogout={handleLogout} />
        ) : (
          <LoginPage onLogin={() => {}} />
        )}
      </div>
    </Router>
  );
};

export default App;