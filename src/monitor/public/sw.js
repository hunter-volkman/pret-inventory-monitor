// Pret Inventory Monitor - Service Worker
// Handles push notifications, offline caching, and background sync

const CACHE_NAME = 'pret-monitor-v1.0.0';
const STATIC_CACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cache successful responses for static assets
            if (shouldCache(event.request.url)) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('./offline.html');
            }
            
            // Return placeholder for images
            if (event.request.destination === 'image') {
              return new Response(
                '<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6b7280">Image Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
          });
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', event => {
  console.log('[SW] Push message received');
  
  let notificationData = {
    title: 'Pret Alert',
    body: 'New alert received',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'pret-alert',
    requireInteraction: false,
    data: {}
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        title: pushData.title || notificationData.title,
        body: pushData.body || notificationData.body,
        icon: pushData.icon || notificationData.icon,
        badge: pushData.badge || notificationData.badge,
        image: pushData.image,
        tag: pushData.tag || notificationData.tag,
        requireInteraction: pushData.requireInteraction || false,
        data: pushData.data || {},
        actions: pushData.actions || [
          {
            action: 'view',
            title: 'View Details',
            icon: './icon-192.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions,
      silent: false,
      vibrate: [200, 100, 200], // Vibration pattern for mobile
      timestamp: Date.now()
    })
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const action = event.action;
  
  // Handle different actions
  if (action === 'dismiss') {
    return; // Just close the notification
  }
  
  // Default action or 'view' action - open the app
  const urlToOpen = notificationData.url || './';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin)) {
            // Focus existing window and navigate to alert
            if (notificationData.alertId) {
              client.postMessage({
                type: 'NOTIFICATION_CLICKED',
                alertId: notificationData.alertId,
                storeId: notificationData.storeId
              });
            }
            return client.focus();
          }
        }
        
        // Open new window if none exists
        return clients.openWindow(urlToOpen);
      })
  );
});

// Background sync event - for offline data synchronization
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Sync pending data when back online
      syncPendingData()
    );
  }
});

// Message event - handle messages from main app
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_ALERT_IMAGE':
      if (data.imageUrl) {
        cacheAlertImage(data.imageUrl);
      }
      break;
      
    case 'CLEAR_NOTIFICATIONS':
      clearAllNotifications();
      break;
      
    case 'UPDATE_BADGE':
      // Update app badge with unread count
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(data.count || 0);
      }
      break;
      
    case 'TRIGGER_SYNC':
      // Manually trigger background sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        self.registration.sync.register('background-sync');
      }
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Utility Functions

/**
 * Determine if a URL should be cached
 */
function shouldCache(url) {
  // Cache static assets and API responses
  return url.includes('/static/') || 
         url.includes('/assets/') || 
         url.includes('.css') || 
         url.includes('.js') || 
         url.includes('.png') || 
         url.includes('.jpg') || 
         url.includes('.svg') ||
         url.includes('/api/') ||
         url.includes('icon-') ||
         url.includes('manifest.json');
}

/**
 * Cache alert images for offline viewing
 */
async function cacheAlertImage(imageUrl) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.add(imageUrl);
    console.log('[SW] Cached alert image:', imageUrl);
  } catch (error) {
    console.error('[SW] Failed to cache alert image:', error);
  }
}

/**
 * Clear all notifications
 */
async function clearAllNotifications() {
  try {
    const notifications = await self.registration.getNotifications();
    notifications.forEach(notification => notification.close());
    console.log('[SW] Cleared all notifications');
  } catch (error) {
    console.error('[SW] Failed to clear notifications:', error);
  }
}

/**
 * Sync pending data when back online
 */
async function syncPendingData() {
  try {
    console.log('[SW] Starting background sync...');
    
    // Get pending alerts from IndexedDB or localStorage
    const pendingAlerts = await getPendingAlerts();
    
    if (pendingAlerts.length > 0) {
      console.log('[SW] Found pending alerts:', pendingAlerts.length);
      
      // Send pending alerts to server or process them
      for (const alert of pendingAlerts) {
        await processPendingAlert(alert);
      }
      
      // Clear pending alerts after successful sync
      await clearPendingAlerts();
      console.log('[SW] Synced pending alerts:', pendingAlerts.length);
      
      // Notify all clients that sync is complete
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          syncedCount: pendingAlerts.length
        });
      });
    }
    
    // Check for critical alerts that need immediate attention
    await checkForCriticalAlerts();
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Get pending alerts from storage
 */
async function getPendingAlerts() {
  try {
    // In a real implementation, you'd use IndexedDB for better offline storage
    // For now, we'll simulate with an empty array
    // You could extend this to actually store and retrieve pending alerts
    
    return []; // Return empty for now
    
    /* Example IndexedDB implementation:
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PretAlertsDB', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['pendingAlerts'], 'readonly');
        const store = transaction.objectStore('pendingAlerts');
        const getAll = store.getAll();
        getAll.onsuccess = () => resolve(getAll.result);
        getAll.onerror = () => reject(getAll.error);
      };
      request.onerror = () => reject(request.error);
    });
    */
    
  } catch (error) {
    console.error('[SW] Failed to get pending alerts:', error);
    return [];
  }
}

/**
 * Process a pending alert
 */
async function processPendingAlert(alert) {
  try {
    console.log('[SW] Processing pending alert:', alert.id);
    
    // In a real implementation, you might:
    // 1. Send to analytics service
    // 2. Update external systems (YOOBIC, etc.)
    // 3. Send to notification service
    // 4. Log to monitoring system
    
    // For now, we'll just log it
    console.log('[SW] Alert processed:', alert);
    
    // Example: Send to external webhook
    /*
    await fetch('/api/alerts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    });
    */
    
  } catch (error) {
    console.error('[SW] Failed to process pending alert:', error);
    throw error; // Re-throw to handle retry logic
  }
}

/**
 * Clear pending alerts from storage
 */
async function clearPendingAlerts() {
  try {
    console.log('[SW] Clearing pending alerts...');
    
    // In a real implementation with IndexedDB:
    /*
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PretAlertsDB', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['pendingAlerts'], 'readwrite');
        const store = transaction.objectStore('pendingAlerts');
        const clear = store.clear();
        clear.onsuccess = () => resolve();
        clear.onerror = () => reject(clear.error);
      };
      request.onerror = () => reject(request.error);
    });
    */
    
  } catch (error) {
    console.error('[SW] Failed to clear pending alerts:', error);
  }
}

/**
 * Check for critical alerts that need immediate attention
 */
async function checkForCriticalAlerts() {
  try {
    console.log('[SW] Checking for critical alerts...');
    
    // This would check with Viam or your alerting service for critical alerts
    // and show notifications even if the app isn't open
    
    // Example implementation:
    /*
    const response = await fetch('/api/alerts/critical', {
      headers: { 'Authorization': 'Bearer ' + await getStoredAuthToken() }
    });
    
    if (response.ok) {
      const criticalAlerts = await response.json();
      
      for (const alert of criticalAlerts) {
        if (alert.severity === 'critical') {
          await self.registration.showNotification(alert.title, {
            body: alert.message,
            icon: './icon-192.png',
            badge: './icon-192.png',
            tag: `critical-${alert.id}`,
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
            data: { alertId: alert.id, storeId: alert.storeId }
          });
        }
      }
    }
    */
    
  } catch (error) {
    console.error('[SW] Failed to check critical alerts:', error);
  }
}

// Periodic background sync for critical alerts (if supported)
self.addEventListener('periodicsync', event => {
  console.log('[SW] Periodic sync:', event.tag);
  
  if (event.tag === 'critical-alert-check') {
    event.waitUntil(
      checkForCriticalAlerts()
    );
  }
});

// Handle online/offline events
self.addEventListener('online', () => {
  console.log('[SW] Device back online - triggering sync');
  
  // Trigger background sync when coming back online
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    self.registration.sync.register('background-sync');
  }
});

self.addEventListener('offline', () => {
  console.log('[SW] Device went offline');
});

// Handle errors
self.addEventListener('error', event => {
  console.error('[SW] Error:', event.error);
  
  // Log error to monitoring service
  // logErrorToService(event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
  
  // Log error to monitoring service
  // logErrorToService(event.reason);
});

// Handle beforeinstallprompt for PWA installation
self.addEventListener('beforeinstallprompt', event => {
  console.log('[SW] PWA install prompt available');
  
  // Store the event for later use
  self.deferredPrompt = event;
  
  // Show custom install UI
  event.preventDefault();
});

// Handle app installation
self.addEventListener('appinstalled', event => {
  console.log('[SW] PWA was installed');
  
  // Track installation for analytics
  // trackPWAInstallation();
});

// Handle visibility changes for better performance
self.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('[SW] App backgrounded - reducing activity');
  } else {
    console.log('[SW] App foregrounded - resuming activity');
  }
});

// Log service worker lifecycle
console.log('[SW] Service Worker script loaded');

// Optional: Send performance metrics
self.addEventListener('load', () => {
  // Report load time and other metrics
  console.log('[SW] App fully loaded');
});

// Handle network status changes
function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  console.log('[SW] Network status:', isOnline ? 'online' : 'offline');
  
  // Notify all clients about network status
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NETWORK_STATUS_CHANGE',
        isOnline: isOnline
      });
    });
  });
}

// Listen for network changes
self.addEventListener('online', updateOnlineStatus);
self.addEventListener('offline', updateOnlineStatus);

// Initialize service worker
console.log('[SW] Pret Inventory Monitor Service Worker initialized');

// Version info
console.log('[SW] Cache version:', CACHE_NAME);
console.log('[SW] Cached URLs:', STATIC_CACHE_URLS);

// Feature detection
console.log('[SW] Push notifications supported:', 'PushManager' in window);
console.log('[SW] Background sync supported:', 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype);
console.log('[SW] Periodic sync supported:', 'serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype);
console.log('[SW] App badge supported:', 'setAppBadge' in navigator);