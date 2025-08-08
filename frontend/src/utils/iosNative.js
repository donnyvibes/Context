// iOS Native Features and Utilities

class IOSNativeFeatures {
  constructor() {
    this.isIOS = this.detectIOS();
    this.isPWA = this.detectPWA();
    this.hasHapticSupport = this.detectHapticSupport();
    this.hasShareSupport = this.detectShareSupport();
    this.initializeIOSFeatures();
  }

  // Device Detection
  detectIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  detectPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  detectHapticSupport() {
    return 'vibrate' in navigator;
  }

  detectShareSupport() {
    return 'share' in navigator;
  }

  // Initialize iOS-specific features
  initializeIOSFeatures() {
    if (this.isIOS) {
      document.body.classList.add('ios-device');
      
      if (this.isPWA) {
        document.body.classList.add('ios-pwa');
      }

      // Prevent iOS bounce scrolling where not wanted
      this.preventOverscroll();
      
      // Setup iOS-specific viewport handling
      this.setupIOSViewport();
      
      // Initialize gesture handlers
      this.initializeGestures();
    }
  }

  // Haptic Feedback
  hapticFeedback(type = 'light') {
    if (!this.hasHapticSupport || !this.isIOS) return;

    const patterns = {
      light: [10],
      medium: [50],
      heavy: [100],
      success: [10, 50, 10],
      warning: [50, 100],
      error: [100, 50, 100]
    };

    const pattern = patterns[type] || patterns.light;
    
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.log('Haptic feedback not available:', error);
    }
  }

  // iOS Share Sheet
  async share(data) {
    if (!this.hasShareSupport) {
      // Fallback to clipboard
      return this.copyToClipboard(data.text || data.url || '');
    }

    try {
      await navigator.share({
        title: data.title || 'ContextOS Prompt',
        text: data.text || '',
        url: data.url || window.location.href
      });
      
      this.hapticFeedback('success');
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        return this.copyToClipboard(data.text || data.url || '');
      }
      return false;
    }
  }

  // Enhanced Clipboard with haptic feedback
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.hapticFeedback('success');
      this.showIOSToast('Copied to clipboard');
      return true;
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.hapticFeedback('success');
        this.showIOSToast('Copied to clipboard');
        return true;
      } catch (err) {
        document.body.removeChild(textArea);
        console.error('Copy failed:', err);
        return false;
      }
    }
  }

  // iOS-style Toast Notifications
  showIOSToast(message, duration = 2000) {
    // Remove existing toast
    const existing = document.querySelector('.ios-toast');
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'ios-toast';
    toast.innerHTML = `
      <div class="ios-toast-content">
        <span>${message}</span>
      </div>
    `;

    // Toast styles
    toast.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      color: white;
      padding: 12px 20px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 15px;
      font-weight: 500;
      z-index: 10000;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    `;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Animate out
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  // iOS Pull-to-Refresh
  initializePullToRefresh(element, callback) {
    let startY = 0;
    let currentY = 0;
    let pulling = false;
    let refreshThreshold = 80;

    const pullIndicator = document.createElement('div');
    pullIndicator.className = 'ios-pull-to-refresh';
    pullIndicator.innerHTML = `
      <div class="ios-activity-indicator"></div>
      <span style="margin-left: 8px;">Pull to refresh</span>
    `;
    element.parentNode.insertBefore(pullIndicator, element);

    element.addEventListener('touchstart', (e) => {
      if (element.scrollTop === 0) {
        startY = e.touches[0].pageY;
        pulling = true;
      }
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
      if (!pulling) return;

      currentY = e.touches[0].pageY;
      const pullDistance = currentY - startY;

      if (pullDistance > 0) {
        e.preventDefault();
        const progress = Math.min(pullDistance / refreshThreshold, 1);
        pullIndicator.style.transform = `translateY(${pullDistance * 0.5}px)`;
        pullIndicator.style.opacity = progress;

        if (progress >= 1) {
          this.hapticFeedback('medium');
          pullIndicator.querySelector('span').textContent = 'Release to refresh';
        } else {
          pullIndicator.querySelector('span').textContent = 'Pull to refresh';
        }
      }
    }, { passive: false });

    element.addEventListener('touchend', async (e) => {
      if (!pulling) return;
      
      pulling = false;
      const pullDistance = currentY - startY;

      if (pullDistance >= refreshThreshold) {
        pullIndicator.style.transform = 'translateY(40px)';
        pullIndicator.querySelector('span').textContent = 'Refreshing...';
        
        this.hapticFeedback('success');
        
        try {
          await callback();
          this.showIOSToast('Refreshed successfully');
        } catch (error) {
          this.showIOSToast('Refresh failed');
          this.hapticFeedback('error');
        }
      }

      // Reset
      setTimeout(() => {
        pullIndicator.style.transform = 'translateY(-100%)';
        pullIndicator.style.opacity = '0';
        pullIndicator.querySelector('span').textContent = 'Pull to refresh';
      }, 500);
    }, { passive: true });
  }

  // iOS Swipe Gestures
  initializeSwipeGestures(element, actions) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let swiping = false;

    element.addEventListener('touchstart', (e) => {
      startX = e.touches[0].pageX;
      startY = e.touches[0].pageY;
      swiping = true;
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
      if (!swiping) return;

      currentX = e.touches[0].pageX;
      currentY = e.touches[0].pageY;

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      // Check if it's a horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
        e.preventDefault();
        
        if (deltaX < -50 && actions.swipeLeft) {
          this.hapticFeedback('light');
          element.style.transform = `translateX(${Math.max(deltaX, -100)}px)`;
        }
      }
    }, { passive: false });

    element.addEventListener('touchend', (e) => {
      if (!swiping) return;
      swiping = false;

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < -80 && actions.swipeLeft) {
          this.hapticFeedback('medium');
          actions.swipeLeft();
        } else if (deltaX > 80 && actions.swipeRight) {
          this.hapticFeedback('medium');
          actions.swipeRight();
        }
      }

      // Reset position
      element.style.transform = '';
    }, { passive: true });
  }

  // Prevent overscroll on iOS
  preventOverscroll() {
    document.body.addEventListener('touchstart', (e) => {
      if (e.target === document.body) {
        e.preventDefault();
      }
    }, { passive: false });

    document.body.addEventListener('touchend', (e) => {
      if (e.target === document.body) {
        e.preventDefault();
      }
    }, { passive: false });

    document.body.addEventListener('touchmove', (e) => {
      if (e.target === document.body) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  // iOS Viewport Setup
  setupIOSViewport() {
    // Prevent zoom on input focus
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      );
    }

    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    });
  }

  // Initialize gesture handlers
  initializeGestures() {
    // Add touch-friendly classes
    document.querySelectorAll('button, .clickable').forEach(element => {
      element.classList.add('ios-touch-optimized');
      
      element.addEventListener('touchstart', () => {
        this.hapticFeedback('light');
      }, { passive: true });
    });
  }

  // iOS-style Activity Indicator
  showActivityIndicator(message = 'Loading...') {
    const indicator = document.createElement('div');
    indicator.className = 'ios-loading-overlay';
    indicator.innerHTML = `
      <div class="ios-loading-content">
        <div class="ios-activity-indicator"></div>
        <span>${message}</span>
      </div>
    `;

    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    const content = indicator.querySelector('.ios-loading-content');
    content.style.cssText = `
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 15px;
      color: #333;
    `;

    document.body.appendChild(indicator);

    requestAnimationFrame(() => {
      indicator.style.opacity = '1';
    });

    return {
      hide: () => {
        indicator.style.opacity = '0';
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 300);
      }
    };
  }

  // Smooth animations with proper easing
  animate(element, keyframes, options = {}) {
    const defaultOptions = {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    };

    return element.animate(keyframes, { ...defaultOptions, ...options });
  }
}

// Export singleton instance
const iosNative = new IOSNativeFeatures();
export default iosNative;