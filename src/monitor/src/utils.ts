import type { Alert, StoreLocation, NotificationPayload } from './types';

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  
  return date.toLocaleDateString();
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Validate alert severity based on type and context
 */
export function calculateAlertSeverity(
  type: Alert['type'],
  context: { temperature?: number; fillPercent?: number; confidence?: number }
): Alert['severity'] {
  switch (type) {
    case 'temperature':
      if (!context.temperature) return 'medium';
      const tempAbs = Math.abs(context.temperature);
      if (tempAbs > 10) return 'critical';
      if (tempAbs > 5) return 'high';
      if (tempAbs > 2) return 'medium';
      return 'low';
      
    case 'empty_shelf':
      if (!context.fillPercent) return 'medium';
      if (context.fillPercent < 5) return 'high';
      if (context.fillPercent < 15) return 'medium';
      if (context.fillPercent < 25) return 'low';
      return 'low';
      
    case 'equipment_failure':
      return 'critical';
      
    default:
      return 'medium';
  }
}

/**
 * Get alert color based on severity
 */
export function getAlertColor(severity: Alert['severity']): string {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#06b6d4';
    default: return '#6b7280';
  }
}

/**
 * Format temperature with proper units
 */
export function formatTemperature(temp: number, unit: 'C' | 'F' = 'C'): string {
  if (unit === 'F') {
    const fahrenheit = (temp * 9/5) + 32;
    return `${fahrenheit.toFixed(1)}°F`;
  }
  return `${temp.toFixed(1)}°C`;
}

/**
 * Check if store should trigger alerts based on business hours
 */
export function isStoreActive(store: StoreLocation): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Basic business hours: 6 AM - 10 PM, Monday to Sunday
  // Pret locations typically have extended hours
  const isWeekend = day === 0 || day === 6;
  const weekdayStart = 6;
  const weekdayEnd = 22;
  const weekendStart = 7;
  const weekendEnd = 21;
  
  if (isWeekend) {
    return hour >= weekendStart && hour <= weekendEnd;
  } else {
    return hour >= weekdayStart && hour <= weekdayEnd;
  }
}

/**
 * Get store region color for map visualization
 */
export function getRegionColor(region: string): string {
  const colors = {
    'manhattan': '#3b82f6',
    'brooklyn': '#10b981',
    'queens': '#f59e0b',
    'bronx': '#ef4444',
    'staten-island': '#8b5cf6',
    'midtown': '#06b6d4',
    'downtown': '#84cc16',
    'uptown': '#f97316'
  };
  
  return colors[region.toLowerCase() as keyof typeof colors] || '#6b7280';
}

/**
 * Safe JSON parse with fallback
 */
export function safeJSONParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Create notification sound (Web Audio API)
 */
export function playNotificationSound(): void {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create a pleasant notification sound (C major chord)
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
}

/**
 * Validate machine connection
 */
export function validateMachineConnection(machineId: string): boolean {
  // Basic validation for machine ID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(machineId) || machineId.startsWith('demo-');
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  } else {
    return `${Math.round(distanceKm)}km`;
  }
}

/**
 * Get current location
 */
export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      position => resolve(position),
      error => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const clonedObj = {} as any;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * Check if app is running in PWA mode
 */
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
}

/**
 * Get app version from build time
 */
export function getAppVersion(): string {
  return (globalThis as any).__APP_VERSION__ || '1.0.0';
}

/**
 * Get build timestamp
 */
export function getBuildTime(): string {
  return (globalThis as any).__BUILD_TIME__ || new Date().toISOString();
}

/**
 * Local storage utilities with error handling
 */
export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  
  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  
  clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Clipboard utilities
 */
export const clipboard = {
  async copy(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      }
    } catch {
      return false;
    }
  },
  
  async read(): Promise<string | null> {
    try {
      if (navigator.clipboard) {
        return await navigator.clipboard.readText();
      }
      return null;
    } catch {
      return null;
    }
  }
};

/**
 * Device detection utilities
 */
export const device = {
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },
  
  isAndroid(): boolean {
    return /Android/.test(navigator.userAgent);
  },
  
  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
  
  getScreenSize(): { width: number; height: number } {
    return {
      width: window.screen.width,
      height: window.screen.height
    };
  },
  
  getViewportSize(): { width: number; height: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
};

/**
 * Network utilities
 */
export const network = {
  isOnline(): boolean {
    return navigator.onLine;
  },
  
  getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  },
  
  estimateBandwidth(): number {
    const connection = (navigator as any).connection;
    return connection?.downlink || 0;
  }
};

/**
 * Performance utilities
 */
export const performance = {
  measureTime<T>(fn: () => T, label?: string): T {
    const start = Date.now();
    const result = fn();
    const duration = Date.now() - start;
    
    if (label) {
      console.log(`${label}: ${duration}ms`);
    }
    
    return result;
  },
  
  async measureAsyncTime<T>(fn: () => Promise<T>, label?: string): Promise<T> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    
    if (label) {
      console.log(`${label}: ${duration}ms`);
    }
    
    return result;
  },
  
  getMemoryUsage(): MemoryInfo | null {
    return (performance as any).memory || null;
  }
};

/**
 * URL utilities
 */
export const url = {
  getQueryParam(name: string): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  },
  
  setQueryParam(name: string, value: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url.toString());
  },
  
  removeQueryParam(name: string): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(name);
    window.history.replaceState({}, '', url.toString());
  },
  
  buildUrl(base: string, params: Record<string, string>): string {
    const url = new URL(base);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }
};

/**
 * Date/time utilities
 */
export const datetime = {
  formatDate(date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    switch (format) {
      case 'short':
        return d.toLocaleDateString();
      case 'long':
        return d.toLocaleDateString(undefined, { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'time':
        return d.toLocaleTimeString(undefined, { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      default:
        return d.toLocaleDateString();
    }
  },
  
  isToday(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return d.toDateString() === today.toDateString();
  },
  
  isYesterday(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.toDateString() === yesterday.toDateString();
  },
  
  getTimeAgo(date: Date | string): string {
    return formatRelativeTime(typeof date === 'string' ? date : date.toISOString());
  }
};

/**
 * Validation utilities
 */
export const validation = {
  isEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  isUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },
  
  isEmpty(value: any): boolean {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }
};

/**
 * Color utilities
 */
export const color = {
  hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },
  
  rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },
  
  adjustOpacity(color: string, opacity: number): string {
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  },
  
  getContrastColor(backgroundColor: string): string {
    const rgb = this.hexToRgb(backgroundColor);
    if (!rgb) return '#000000';
    
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }
};

export default {
  formatRelativeTime,
  generateId,
  debounce,
  calculateAlertSeverity,
  getAlertColor,
  formatTemperature,
  isStoreActive,
  getRegionColor,
  safeJSONParse,
  playNotificationSound,
  validateMachineConnection,
  calculateDistance,
  formatDistance,
  getCurrentLocation,
  throttle,
  formatFileSize,
  deepClone,
  isPWA,
  getAppVersion,
  getBuildTime,
  storage,
  clipboard,
  device,
  network,
  performance,
  url,
  datetime,
  validation,
  color
};