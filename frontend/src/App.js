import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
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

// Make ApiService available globally for components
window.ApiService = ApiService;

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
      iosNative.hapticFeedback('error');
      iosNative.showIOSToast('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Initialize pull-to-refresh
    const mainElement = document.querySelector('main');
    if (mainElement) {
      iosNative.initializePullToRefresh(mainElement, loadData);
    }
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
      iosNative.hapticFeedback('medium');
      const loadingIndicator = iosNative.showActivityIndicator(editingPrompt ? 'Updating prompt...' : 'Creating prompt...');
      
      if (editingPrompt) {
        await ApiService.put(`/api/prompts/${editingPrompt.id}`, promptData);
        iosNative.showIOSToast('Prompt updated successfully!');
      } else {
        await ApiService.post('/api/prompts', promptData);
        iosNative.showIOSToast('Prompt created successfully!');
      }
      
      await loadData();
      setShowCreateModal(false);
      setEditingPrompt(null);
      iosNative.hapticFeedback('success');
      
      loadingIndicator.hide();
    } catch (error) {
      iosNative.hapticFeedback('error');
      iosNative.showIOSToast('Error saving prompt');
    }
  };

  const handleDeletePrompt = async (promptId) => {
    // iOS-style confirmation
    iosNative.hapticFeedback('warning');
    
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        iosNative.hapticFeedback('medium');
        const loadingIndicator = iosNative.showActivityIndicator('Deleting prompt...');
        
        await ApiService.delete(`/api/prompts/${promptId}`);
        await loadData();
        
        iosNative.hapticFeedback('success');
        iosNative.showIOSToast('Prompt deleted successfully!');
        
        loadingIndicator.hide();
      } catch (error) {
        iosNative.hapticFeedback('error');
        iosNative.showIOSToast('Error deleting prompt');
      }
    }
  };

  const handleEditPrompt = (prompt) => {
    iosNative.hapticFeedback('light');
    setEditingPrompt(prompt);
    setShowCreateModal(true);
  };

  const handleGeneratePrompt = (prompt) => {
    iosNative.hapticFeedback('light');
    setGeneratingPrompt(prompt);
    setShowGenerateModal(true);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-ios-background ios-smooth-scroll">
      <Header 
        user={user} 
        onLogout={onLogout}
        onShowCreate={() => {
          iosNative.hapticFeedback('light');
          setShowCreateModal(true);
        }}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ios-safe-area-bottom">
        <div className="mb-8">
          <h2 className="ios-title1 text-gray-900 mb-2">Your Prompt Library</h2>
          <p className="ios-body text-gray-600">
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
            <h3 className="ios-headline text-gray-900 mb-2">
              {searchQuery || selectedCategory ? 'No prompts found' : 'No prompts yet'}
            </h3>
            <p className="ios-body text-gray-600 mb-4">
              {searchQuery || selectedCategory 
                ? 'Try adjusting your search or category filter'
                : 'Create your first prompt to get started'
              }
            </p>
            {!searchQuery && !selectedCategory && (
              <button
                onClick={() => {
                  iosNative.hapticFeedback('medium');
                  setShowCreateModal(true);
                }}
                className="ios-btn-primary"
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
          iosNative.hapticFeedback('light');
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
          iosNative.hapticFeedback('light');
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
    // Initialize iOS native features
    iosNative.initializeIOSFeatures();
    
    // Check for session token in URL (from auth redirect)
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
      iosNative.hapticFeedback('medium');
      const loadingIndicator = iosNative.showActivityIndicator('Signing in...');
      
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
        
        iosNative.hapticFeedback('success');
        iosNative.showIOSToast(`Welcome back, ${data.user.name}!`);
      } else {
        throw new Error('Authentication failed');
      }
      
      loadingIndicator.hide();
    } catch (error) {
      console.error('Auth error:', error);
      iosNative.hapticFeedback('error');
      iosNative.showIOSToast('Authentication failed. Please try again.');
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
    iosNative.hapticFeedback('medium');
    
    if (window.confirm('Are you sure you want to logout?')) {
      Cookies.remove('session_token');
      setUser(null);
      iosNative.hapticFeedback('success');
      iosNative.showIOSToast('Logged out successfully');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="App ios-touch-optimized">
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