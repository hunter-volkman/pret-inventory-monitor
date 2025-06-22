// Core application types for Pret Inventory Monitor

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  coords: { lat: number; lng: number };
  machineId: string;
  status: 'online' | 'offline' | 'unknown';
  region: string;
}

export interface Alert {
  id: string;
  storeId: string;
  storeName: string;
  type: 'empty_shelf' | 'temperature' | 'equipment_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  
  // Optional context data
  location?: string;
  shelves?: string[];
  temperature?: number;
  threshold?: number;
  confidence?: number;
  
  // Image data
  imageUrl?: string;
  annotatedImageUrl?: string;
}

export interface SensorReading {
  componentName: string;
  reading: any;
  timestamp: string;
  machineId: string;
}

export interface AppState {
  stores: StoreLocation[];
  alerts: Alert[];
  selectedStores: Set<string>;
  currentView: 'stores' | 'alerts' | 'camera' | 'map';
  isOnline: boolean;
  lastSync: string;
}

export interface ViamCredentials {
  id: string;
  key: string;
  hostname: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// Utility types
export type ViewType = 'stores' | 'alerts' | 'camera' | 'map';
export type AlertType = Alert['type'];
export type AlertSeverity = Alert['severity'];
export type StoreStatus = StoreLocation['status'];

// Viam SDK types extensions
export interface ViamConnection {
  client: any; // VIAM.RobotClient
  connected: boolean;
  lastActivity: string;
}

// Map types
export interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  color: string;
  alertCount: number;
  store: StoreLocation;
}

// Alert filtering types
export interface AlertFilter {
  storeId?: string;
  type?: AlertType;
  severity?: AlertSeverity;
  unreadOnly?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Camera types
export interface CameraStream {
  storeId: string;
  streamUrl?: string;
  isActive: boolean;
  lastFrame?: string;
  annotations?: CameraAnnotation[];
}

export interface CameraAnnotation {
  type: 'shelf' | 'person' | 'alert';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  label: string;
}

// Service Worker types
export interface ServiceWorkerMessage {
  type: 'NOTIFICATION_CLICKED' | 'SYNC_COMPLETE' | 'NETWORK_STATUS_CHANGE' | 'CACHE_ALERT_IMAGE' | 'CLEAR_NOTIFICATIONS';
  data?: any;
  alertId?: string;
  storeId?: string;
  isOnline?: boolean;
  syncedCount?: number;
}

// Settings types
export interface AppSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  updateInterval: number;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  temperatureUnit: 'C' | 'F';
}

// Analytics types
export interface AnalyticsEvent {
  type: 'alert_created' | 'alert_viewed' | 'store_connected' | 'app_opened';
  timestamp: string;
  data: Record<string, any>;
  storeId?: string;
  userId?: string;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Performance monitoring types
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
}