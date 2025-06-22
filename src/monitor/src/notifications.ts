// src/notifications.ts - Push notification utilities  
import type { Alert, NotificationPayload } from './types';

export class NotificationUtils {
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  static async sendLocalNotification(alert: Alert): Promise<void> {
    if (Notification.permission !== 'granted') return;
    
    const notification = new Notification(alert.title, {
      body: alert.message.split('\n')[0],
      icon: './icon-192.png',
      tag: `alert-${alert.id}`,
      requireInteraction: alert.severity === 'critical'
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Dispatch custom event for alert click
      window.dispatchEvent(new CustomEvent('alert-clicked', { 
        detail: { alertId: alert.id } 
      }));
    };
    
    // Auto-close after 5 seconds for non-critical alerts
    if (alert.severity !== 'critical') {
      setTimeout(() => notification.close(), 5000);
    }
  }
  
  static createNotificationPayload(alert: Alert): NotificationPayload {
    return {
      title: alert.title,
      body: alert.message.split('\n')[0],
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
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };
  }
  
  static isNotificationSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }
  
  static getBadgeCount(alerts: Alert[]): number {
    return alerts.filter(alert => !alert.read).length;
  }
}