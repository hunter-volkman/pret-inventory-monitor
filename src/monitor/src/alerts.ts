import type { Alert, StoreLocation, NotificationPayload } from './types';
import { generateId, calculateAlertSeverity, playNotificationSound } from './utils';

/**
 * Alert Manager - Handles alert creation, storage, and notifications
 */
export class AlertManager {
  private alerts: Alert[] = [];
  private listeners: Array<(alerts: Alert[]) => void> = [];
  private notificationQueue: Alert[] = [];
  
  constructor() {
    this.loadFromStorage();
    this.setupNotificationQueue();
  }

  /**
   * Add new alert and trigger notifications
   */
  addAlert(alertData: Partial<Alert> & { 
    storeId: string; 
    type: Alert['type']; 
    title: string; 
    message: string;
  }): Alert {
    const alert: Alert = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      read: false,
      severity: calculateAlertSeverity(alertData.type, {
        temperature: alertData.temperature,
        fillPercent: (alertData as any).fillPercent,
        confidence: alertData.confidence
      }),
      ...alertData
    } as Alert;

    this.alerts.unshift(alert);
    this.saveToStorage();
    this.notifyListeners();
    
    // Queue for push notification
    this.queueNotification(alert);
    
    return alert;
  }

  /**
   * Mark alert as read
   */
  markAsRead(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.read) {
      alert.read = true;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Mark all alerts as read
   */
  markAllAsRead(): void {
    let hasChanges = false;
    this.alerts.forEach(alert => {
      if (!alert.read) {
        alert.read = true;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Delete alert
   */
  deleteAlert(alertId: string): void {
    const index = this.alerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      this.alerts.splice(index, 1);
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Clear all alerts
   */
  clearAll(): void {
    this.alerts = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Get alerts with optional filtering
   */
  getAlerts(filter?: {
    storeId?: string;
    type?: Alert['type'];
    severity?: Alert['severity'];
    unreadOnly?: boolean;
    limit?: number;
  }): Alert[] {
    let filtered = [...this.alerts];
    
    if (filter?.storeId) {
      filtered = filtered.filter(a => a.storeId === filter.storeId);
    }
    
    if (filter?.type) {
      filtered = filtered.filter(a => a.type === filter.type);
    }
    
    if (filter?.severity) {
      filtered = filtered.filter(a => a.severity === filter.severity);
    }
    
    if (filter?.unreadOnly) {
      filtered = filtered.filter(a => !a.read);
    }
    
    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }
    
    return filtered;
  }

  /**
   * Get unread count for a specific store or all stores
   */
  getUnreadCount(storeId?: string): number {
    return this.getAlerts({ storeId, unreadOnly: true }).length;
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(): Record<Alert['severity'], Alert[]> {
    return {
      critical: this.getAlerts({ severity: 'critical' }),
      high: this.getAlerts({ severity: 'high' }),
      medium: this.getAlerts({ severity: 'medium' }),
      low: this.getAlerts({ severity: 'low' })
    };
  }

  /**
   * Get alert statistics
   */
  getStatistics(): {
    total: number;
    unread: number;
    byType: Record<Alert['type'], number>;
    bySeverity: Record<Alert['severity'], number>;
    last24Hours: number;
  } {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const byType = this.alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<Alert['type'], number>);
    
    const bySeverity = this.alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<Alert['severity'], number>);
    
    return {
      total: this.alerts.length,
      unread: this.getUnreadCount(),
      byType,
      bySeverity,
      last24Hours: this.alerts.filter(a => new Date(a.timestamp) > yesterday).length
    };
  }

  /**
   * Subscribe to alert changes
   */
  subscribe(listener: (alerts: Alert[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Generate test alert for development
   */
  createTestAlert(store: StoreLocation): Alert {
    const alertTypes = [
      {
        type: 'empty_shelf' as const,
        title: `Empty Shelves: B-1, B-2 - ${store.name}`,
        message: `The following shelves are empty: B-1, B-2\nLocation: ${store.address}\nTime: ${new Date().toLocaleString()}\n\nSee the attached image for review.`,
        shelves: ['B-1', 'B-2'],
        confidence: Math.round(Math.random() * 30 + 70)
      },
      {
        type: 'temperature' as const,
        title: `Temperature Alert - ${store.name}`,
        message: `Temperature: 8.5°C (Threshold: 5.0°C)\nLocation: ${store.address}\nTime: ${new Date().toLocaleString()}`,
        temperature: 8.5,
        threshold: 5.0,
        confidence: Math.round(Math.random() * 20 + 80)
      },
      {
        type: 'equipment_failure' as const,
        title: `Equipment Failure - ${store.name}`,
        message: `HVAC system offline\nLocation: ${store.address}\nTime: ${new Date().toLocaleString()}`,
        confidence: 100
      }
    ];

    const alertData = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    
    return this.addAlert({
      storeId: store.id,
      storeName: store.name,
      location: store.address,
      imageUrl: 'https://via.placeholder.com/400x300/f3f4f6/6b7280?text=Raw+Camera+Image',
      annotatedImageUrl: 'https://via.placeholder.com/400x300/fef2f2/ef4444?text=Detected+Issue',
      ...alertData
    });
  }

  /**
   * Export alerts as JSON
   */
  exportAlerts(): string {
    return JSON.stringify({
      alerts: this.alerts,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2);
  }

  /**
   * Import alerts from JSON
   */
  importAlerts(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.alerts && Array.isArray(data.alerts)) {
        this.alerts = data.alerts;
        this.saveToStorage();
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import alerts:', error);
      return false;
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.alerts]));
  }

  private saveToStorage(): void {
    try {
      // Keep only last 1000 alerts to prevent storage bloat
      const alertsToSave = this.alerts.slice(0, 1000);
      localStorage.setItem('pret-alerts', JSON.stringify(alertsToSave));
    } catch (error) {
      console.warn('Failed to save alerts to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('pret-alerts');
      if (stored) {
        this.alerts = JSON.parse(stored);
        // Validate alert structure
        this.alerts = this.alerts.filter(alert => 
          alert && alert.id && alert.type && alert.title && alert.message
        );
      }
    } catch (error) {
      console.warn('Failed to load alerts from storage:', error);
      this.alerts = [];
    }
  }

  private queueNotification(alert: Alert): void {
    this.notificationQueue.push(alert);
  }

  private setupNotificationQueue(): void {
    // Process notification queue every 2 seconds to avoid spam
    setInterval(() => {
      if (this.notificationQueue.length > 0) {
        const alert = this.notificationQueue.shift()!;
        this.sendPushNotification(alert);
      }
    }, 2000);
  }

  private async sendPushNotification(alert: Alert): Promise<void> {
    if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const payload: NotificationPayload = {
        title: alert.title,
        body: alert.message.split('\n')[0], // First line only for mobile
        icon: './icon-192.png',
        badge: './icon-192.png',
        image: alert.imageUrl,
        data: {
          alertId: alert.id,
          storeId: alert.storeId,
          type: alert.type,
          url: `/?alert=${alert.id}`
        },
        tag: `alert-${alert.type}-${alert.storeId}`,
        requireInteraction: alert.severity === 'critical',
        actions: [
          {
            action: 'view',
            title: 'View Details'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };

      await registration.showNotification(payload.title, payload);
      
      // Play notification sound for high priority alerts
      if (alert.severity === 'critical' || alert.severity === 'high') {
        playNotificationSound();
      }
      
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }
}

/**
 * Smart alert filtering to prevent false positives
 */
export class SmartAlertFilter {
  private recentAlerts = new Map<string, number>();
  private suppressionRules = new Map<string, number>();
  
  /**
   * Check if alert should be suppressed to prevent spam
   */
  shouldSuppressAlert(
    storeId: string,
    type: Alert['type'],
    context: {
      personDetected?: boolean;
      isBusinessHours?: boolean;
      fillPercent?: number;
      temperature?: number;
      confidence?: number;
    }
  ): boolean {
    const alertKey = `${storeId}-${type}`;
    const now = Date.now();
    const lastAlert = this.recentAlerts.get(alertKey) || 0;
    
    // Basic suppression: prevent duplicate alerts within time window
    const suppressionTime = this.getSuppressionTime(type, context);
    if (now - lastAlert < suppressionTime) {
      return true;
    }
    
    // Type-specific suppression logic
    if (this.shouldSuppressBasedOnContext(type, context)) {
      return true;
    }
    
    // Confidence-based suppression
    if (context.confidence && context.confidence < this.getMinConfidence(type)) {
      return true;
    }
    
    // Update last alert time
    this.recentAlerts.set(alertKey, now);
    
    // Clean up old entries (older than 1 hour)
    this.cleanupOldEntries();
    
    return false;
  }

  /**
   * Set custom suppression rule for specific alert type
   */
  setSuppressionRule(type: Alert['type'], timeMs: number): void {
    this.suppressionRules.set(type, timeMs);
  }

  /**
   * Clear all suppression history
   */
  clearSuppressionHistory(): void {
    this.recentAlerts.clear();
  }

  private shouldSuppressBasedOnContext(
    type: Alert['type'],
    context: {
      personDetected?: boolean;
      isBusinessHours?: boolean;
      fillPercent?: number;
      temperature?: number;
    }
  ): boolean {
    switch (type) {
      case 'empty_shelf':
        // Suppress if person detected (likely restocking)
        if (context.personDetected) return true;
        
        // Suppress if fill percentage is not critically low
        if (context.fillPercent && context.fillPercent > 20) return true;
        
        // Suppress during non-business hours for minor issues
        if (!context.isBusinessHours && context.fillPercent && context.fillPercent > 10) {
          return true;
        }
        
        break;
        
      case 'temperature':
        // Suppress minor temperature variations during business hours
        if (context.isBusinessHours && context.temperature && Math.abs(context.temperature) < 3) {
          return true;
        }
        
        // Suppress very minor variations anytime
        if (context.temperature && Math.abs(context.temperature) < 1) {
          return true;
        }
        
        break;
        
      case 'equipment_failure':
        // Never suppress equipment failures
        break;
    }
    
    return false;
  }

  private getSuppressionTime(
    type: Alert['type'],
    context: { isBusinessHours?: boolean }
  ): number {
    // Check for custom suppression rules first
    const customRule = this.suppressionRules.get(type);
    if (customRule) return customRule;
    
    // Default suppression times
    const baseTimes = {
      'empty_shelf': 5 * 60 * 1000,      // 5 minutes
      'temperature': 10 * 60 * 1000,     // 10 minutes
      'equipment_failure': 2 * 60 * 1000  // 2 minutes
    };
    
    let suppressionTime = baseTimes[type] || 5 * 60 * 1000;
    
    // Reduce suppression time during business hours for critical alerts
    if (context.isBusinessHours && (type === 'equipment_failure' || type === 'temperature')) {
      suppressionTime = suppressionTime / 2;
    }
    
    return suppressionTime;
  }

  private getMinConfidence(type: Alert['type']): number {
    const minConfidences = {
      'empty_shelf': 70,
      'temperature': 80,
      'equipment_failure': 90
    };
    
    return minConfidences[type] || 75;
  }

  private cleanupOldEntries(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [key, time] of this.recentAlerts.entries()) {
      if (now - time > oneHour) {
        this.recentAlerts.delete(key);
      }
    }
  }
}

/**
 * Alert notification manager with advanced features
 */
export class AlertNotificationManager {
  private alertManager: AlertManager;
  private isEnabled: boolean = true;
  private soundEnabled: boolean = true;
  
  constructor(alertManager: AlertManager) {
    this.alertManager = alertManager;
    this.loadSettings();
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    this.isEnabled = permission === 'granted';
    this.saveSettings();
    
    return this.isEnabled;
  }

  /**
   * Enable/disable notifications
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.saveSettings();
  }

  /**
   * Enable/disable notification sounds
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.saveSettings();
  }

  /**
   * Test notification
   */
  async sendTestNotification(): Promise<void> {
    if (!this.isEnabled) {
      await this.requestPermission();
    }

    if (this.isEnabled) {
      new Notification('Pret Monitor Test', {
        body: 'This is a test notification',
        icon: './icon-192.png',
        tag: 'test-notification'
      });

      if (this.soundEnabled) {
        playNotificationSound();
      }
    }
  }

  /**
   * Get notification settings
   */
  getSettings(): { enabled: boolean; soundEnabled: boolean } {
    return {
      enabled: this.isEnabled,
      soundEnabled: this.soundEnabled
    };
  }

  private loadSettings(): void {
    try {
      const settings = localStorage.getItem('pret-notification-settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        this.isEnabled = parsed.enabled ?? true;
        this.soundEnabled = parsed.soundEnabled ?? true;
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      const settings = {
        enabled: this.isEnabled,
        soundEnabled: this.soundEnabled
      };
      localStorage.setItem('pret-notification-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save notification settings:', error);
    }
  }
}