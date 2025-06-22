import * as VIAM from "@viamrobotics/sdk";
import Cookies from "js-cookie";
import type { StoreLocation, Alert, AppState, ViamCredentials, ViewType, SensorReading } from './types';
import { AlertManager, SmartAlertFilter } from './alerts';
import { formatRelativeTime, debounce, isStoreActive, safeJSONParse, playNotificationSound } from './utils';

/**
 * Machine Connection Manager - Handles multiple Viam connections
 */
class MachineConnectionManager {
  private connections = new Map<string, VIAM.RobotClient>();
  private credentials: ViamCredentials | null = null;

  async initialize(): Promise<void> {
    // Get credentials from cookies (set by Viam Apps)
    const machineId = window.location.pathname.split("/")[2];
    if (machineId) {
      try {
        const credData = Cookies.get(machineId);
        if (credData) {
          this.credentials = JSON.parse(credData);
        }
      } catch (error) {
        console.error('Failed to parse credentials:', error);
      }
    }
  }

  async connectToStore(store: StoreLocation): Promise<boolean> {
    if (!this.credentials) {
      console.error('No credentials available');
      return false;
    }

    try {
      const opts: VIAM.ViamClientOptions = {
        serviceHost: "https://app.viam.com",
        credentials: {
          type: "api-key",
          authEntity: this.credentials.id,
          payload: this.credentials.key,
        },
      };

      const client = await VIAM.createViamClient(opts);
      const robot = await client.appClient.getRobot(store.machineId);
      
      if (robot) {
        this.connections.set(store.id, await client.connectToMachine({
          host: this.credentials.hostname,
          credentials: {
            type: "api-key",
            authEntity: this.credentials.id,
            payload: this.credentials.key,
          }
        }));
        console.log(`Connected to ${store.name}`);
        return true;
      }
    } catch (error) {
      console.error(`Failed to connect to ${store.name}:`, error);
    }
    return false;
  }

  async getSensorData(storeId: string): Promise<SensorReading[]> {
    const client = this.connections.get(storeId);
    if (!client) return [];

    try {
      // Get fill percentage sensor readings
      const fillSensor = await client.getResource('sensor', 'fill-sensor');
      const readings = await fillSensor.getReadings();
      
      return Object.entries(readings).map(([region, percentage]) => ({
        componentName: region,
        reading: percentage,
        timestamp: new Date().toISOString(),
        machineId: storeId
      }));
    } catch (error) {
      console.error(`Failed to get sensor data for ${storeId}:`, error);
      return [];
    }
  }

  async getCameraFrame(storeId: string): Promise<string | null> {
    const client = this.connections.get(storeId);
    if (!client) return null;

    try {
      // Get annotated camera feed from fill-percent-camera
      const camera = await client.getResource('camera', 'fill-camera');
      const image = await camera.getImage();
      
      // Convert to base64 data URL
      const blob = new Blob([image], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error(`Failed to get camera frame for ${storeId}:`, error);
      return null;
    }
  }

  async getTemperatureData(storeId: string): Promise<SensorReading[]> {
    const client = this.connections.get(storeId);
    if (!client) return [];

    try {
      // Get LoRaWAN temperature sensors
      const tempSensors = await client.resourceNames().filter(name => 
        name.namespace === 'viam' && 
        name.type === 'sensor' && 
        name.name.includes('temp')
      );

      const readings: SensorReading[] = [];
      for (const sensorName of tempSensors) {
        const sensor = await client.getResource('sensor', sensorName.name);
        const data = await sensor.getReadings();
        
        if (data.TempC_SHT !== undefined) {
          readings.push({
            componentName: sensorName.name,
            reading: data.TempC_SHT,
            timestamp: new Date().toISOString(),
            machineId: storeId
          });
        }
      }
      
      return readings;
    } catch (error) {
      console.error(`Failed to get temperature data for ${storeId}:`, error);
      return [];
    }
  }

  isConnected(storeId: string): boolean {
    return this.connections.has(storeId);
  }
}

/**
 * Push Notification Manager
 */
class PushNotificationManager {
  private permission: NotificationPermission = 'default';

  async initialize(): Promise<void> {
    if ('Notification' in window) {
      this.permission = Notification.permission;
      if (this.permission === 'default') {
        await this.requestPermission();
      }
    }

    // Register service worker for push notifications
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('./sw.js');
        console.log('Service Worker registered');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    }
    return false;
  }

  async sendPushNotification(alert: Alert): Promise<void> {
    if (this.permission !== 'granted') return;

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification(alert.title, {
          body: alert.message.split('\n')[0],
          icon: './icon-192.png',
          badge: './icon-192.png',
          image: alert.imageUrl,
          data: {
            alertId: alert.id,
            storeId: alert.storeId,
            url: `?alert=${alert.id}`
          },
          tag: `alert-${alert.type}-${alert.storeId}`,
          requireInteraction: alert.severity === 'critical',
          actions: [
            { action: 'view', title: 'View Details' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        });

        // Play sound for high priority alerts
        if (alert.severity === 'critical' || alert.severity === 'high') {
          playNotificationSound();
        }
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }
  }
}

/**
 * Interactive Map Component using Leaflet
 */
class InteractiveMap {
  private map: any = null;
  private markers = new Map<string, any>();
  private L: any = null;

  async initialize(containerId: string): Promise<void> {
    // Dynamically import Leaflet
    try {
      // @ts-ignore
      this.L = window.L || await import('leaflet');
      
      // Initialize map centered on NYC
      this.map = this.L.map(containerId).setView([40.7589, -73.9851], 12);
      
      // Add OpenStreetMap tiles (free, no API key needed)
      this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  }

  updateStoreMarkers(stores: StoreLocation[], alerts: Alert[]): void {
    if (!this.map || !this.L) return;

    stores.forEach(store => {
      const storeAlerts = alerts.filter(a => a.storeId === store.id && !a.read);
      const alertCount = storeAlerts.length;
      const markerColor = this.getMarkerColor(store.status, alertCount);
      
      if (this.markers.has(store.id)) {
        this.updateMarker(store.id, markerColor, alertCount);
      } else {
        this.createMarker(store, markerColor, alertCount);
      }
    });

    // Auto-zoom to fit all markers
    if (this.markers.size > 0) {
      const group = this.L.featureGroup(Array.from(this.markers.values()));
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  private createMarker(store: StoreLocation, color: string, alertCount: number): void {
    const icon = this.L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-container" style="background-color: ${color}">
          <span class="marker-icon">🏪</span>
          ${alertCount > 0 ? `<span class="marker-badge">${alertCount}</span>` : ''}
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const marker = this.L.marker([store.coords.lat, store.coords.lng], { icon })
      .bindPopup(`
        <div class="map-popup">
          <h3>${store.name}</h3>
          <p>${store.address}</p>
          <p>Status: <span class="status-${store.status}">${store.status}</span></p>
          ${alertCount > 0 ? `<p class="alert-count">${alertCount} active alerts</p>` : ''}
        </div>
      `)
      .addTo(this.map);

    this.markers.set(store.id, marker);
  }

  private updateMarker(storeId: string, color: string, alertCount: number): void {
    const marker = this.markers.get(storeId);
    if (marker) {
      const newIcon = this.L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="marker-container" style="background-color: ${color}">
            <span class="marker-icon">🏪</span>
            ${alertCount > 0 ? `<span class="marker-badge">${alertCount}</span>` : ''}
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      marker.setIcon(newIcon);
    }
  }

  private getMarkerColor(status: StoreLocation['status'], alertCount: number): string {
    if (alertCount > 0) return '#ef4444'; // Red for alerts
    if (status === 'online') return '#10b981'; // Green
    if (status === 'offline') return '#6b7280'; // Gray
    return '#f59e0b'; // Yellow for unknown
  }
}

/**
 * Main Application Class
 */
class InventoryMonitorApp {
  private state: AppState;
  private connectionManager: MachineConnectionManager;
  private alertManager: AlertManager;
  private notificationManager: PushNotificationManager;
  private smartFilter: SmartAlertFilter;
  private map: InteractiveMap;
  private updateInterval: NodeJS.Timeout | null = null;

  // Pret store configuration
  private readonly stores: StoreLocation[] = [
    {
      id: 'store-5th-ave',
      name: 'Pret 5th Avenue',
      address: '389 5th Ave, New York, NY 10016',
      coords: { lat: 40.7516, lng: -73.9755 },
      machineId: 'a7c5717d-f48e-4ac8-b179-7c7aa73571de',
      status: 'unknown',
      region: 'manhattan'
    },
    {
      id: 'store-times-square',
      name: 'Pret Times Square',
      address: '1500 Broadway, New York, NY 10036',
      coords: { lat: 40.7589, lng: -73.9851 },
      machineId: 'demo-machine-times-square',
      status: 'unknown',
      region: 'manhattan'
    },
    {
      id: 'store-grand-central',
      name: 'Pret Grand Central',
      address: '89 E 42nd St, New York, NY 10017',
      coords: { lat: 40.7527, lng: -73.9772 },
      machineId: 'demo-machine-grand-central',
      status: 'unknown',
      region: 'manhattan'
    }
  ];

  constructor() {
    this.state = {
      stores: this.stores,
      alerts: [],
      selectedStores: new Set(),
      currentView: 'stores',
      isOnline: navigator.onLine,
      lastSync: new Date().toISOString()
    };

    this.connectionManager = new MachineConnectionManager();
    this.alertManager = new AlertManager();
    this.notificationManager = new PushNotificationManager();
    this.smartFilter = new SmartAlertFilter();
    this.map = new InteractiveMap();

    this.bindEvents();
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Pret Inventory Monitor...');
    
    try {
      // Initialize all managers
      await this.connectionManager.initialize();
      await this.notificationManager.initialize();
      
      // Load saved state
      this.loadState();
      
      // Render initial UI
      this.render();
      
      // Initialize map if on map view
      if (this.state.currentView === 'map') {
        await this.initializeMap();
      }
      
      // Connect to selected stores
      await this.connectToSelectedStores();
      
      // Start real-time updates
      this.startRealTimeUpdates();
      
      console.log('✅ Initialization complete');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      this.showError('Failed to initialize app. Please refresh the page.');
    }
  }

  private async connectToSelectedStores(): Promise<void> {
    const selectedStores = Array.from(this.state.selectedStores);
    if (selectedStores.length === 0) {
      // Auto-select first store for demo
      this.state.selectedStores.add(this.stores[0].id);
    }

    const connections = Array.from(this.state.selectedStores).map(async storeId => {
      const store = this.stores.find(s => s.id === storeId);
      if (store) {
        const connected = await this.connectionManager.connectToStore(store);
        store.status = connected ? 'online' : 'offline';
      }
    });

    await Promise.allSettled(connections);
    this.render();
  }

  private async initializeMap(): Promise<void> {
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      await this.map.initialize('map-container');
      this.map.updateStoreMarkers(this.state.stores, this.state.alerts);
    }
  }

  private startRealTimeUpdates(): void {
    // Update every 30 seconds
    this.updateInterval = setInterval(async () => {
      await this.updateAllStores();
    }, 30000);

    // Initial update
    setTimeout(() => this.updateAllStores(), 1000);
  }

  private async updateAllStores(): Promise<void> {
    const selectedStores = Array.from(this.state.selectedStores);
    
    for (const storeId of selectedStores) {
      const store = this.stores.find(s => s.id === storeId);
      if (store && this.connectionManager.isConnected(storeId)) {
        await this.processStoreData(store);
      }
    }
    
    this.state.lastSync = new Date().toISOString();
    this.render();
  }

  private async processStoreData(store: StoreLocation): Promise<void> {
    try {
      // Get sensor readings
      const sensorData = await this.connectionManager.getSensorData(store.id);
      const cameraFrame = await this.connectionManager.getCameraFrame(store.id);
      
      // Process fill percentage alerts
      for (const reading of sensorData) {
        if (this.isShelfEmpty(reading) && !this.smartFilter.shouldSuppressAlert(
          store.id, 
          'empty_shelf', 
          { fillPercent: reading.reading as number, isBusinessHours: isStoreActive(store) }
        )) {
          await this.createEmptyShelfAlert(store, reading, cameraFrame);
        }
      }
      
      // Process temperature alerts
      const tempData = await this.connectionManager.getTemperatureData(store.id);
      for (const temp of tempData) {
        if (this.isTemperatureAlert(temp) && !this.smartFilter.shouldSuppressAlert(
          store.id,
          'temperature',
          { temperature: temp.reading as number, isBusinessHours: isStoreActive(store) }
        )) {
          await this.createTemperatureAlert(store, temp);
        }
      }
      
    } catch (error) {
      console.error(`Failed to process data for ${store.name}:`, error);
    }
  }

  private isShelfEmpty(reading: any): boolean {
    return typeof reading.reading === 'number' && reading.reading < 15; // 15% threshold
  }

  private isTemperatureAlert(reading: any): boolean {
    return typeof reading.reading === 'number' && Math.abs(reading.reading) > 5; // 5°C threshold
  }

  private async createEmptyShelfAlert(store: StoreLocation, reading: any, cameraFrame: string | null): Promise<void> {
    const alert = this.alertManager.addAlert({
      storeId: store.id,
      storeName: store.name,
      type: 'empty_shelf',
      title: `Empty Shelves: ${reading.componentName} - ${store.name}`,
      message: `The following shelves are empty: ${reading.componentName}\nLocation: ${store.address}\nTime: ${new Date().toLocaleString()}\n\nSee the attached image for review.`,
      shelves: [reading.componentName],
      confidence: 95,
      location: store.address,
      imageUrl: cameraFrame || undefined,
      annotatedImageUrl: cameraFrame || undefined
    });
    
    await this.notificationManager.sendPushNotification(alert);
    this.state.alerts = this.alertManager.getAlerts();
  }

  private async createTemperatureAlert(store: StoreLocation, reading: any): Promise<void> {
    const alert = this.alertManager.addAlert({
      storeId: store.id,
      storeName: store.name,
      type: 'temperature',
      title: `Temperature Alert - ${store.name}`,
      message: `Temperature: ${reading.reading}°C (Threshold: 5.0°C)\nLocation: ${store.address}\nTime: ${new Date().toLocaleString()}`,
      temperature: reading.reading,
      threshold: 5.0,
      confidence: 90,
      location: store.address
    });
    
    await this.notificationManager.sendPushNotification(alert);
    this.state.alerts = this.alertManager.getAlerts();
  }

  private bindEvents(): void {
    // Tab navigation
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target.classList.contains('tab-btn') || target.closest('.tab-btn')) {
        const tabBtn = target.classList.contains('tab-btn') ? target : target.closest('.tab-btn');
        const tab = tabBtn?.getAttribute('data-tab') as ViewType;
        if (tab) {
          this.switchTab(tab);
        }
      }
      
      // Store selection toggles
      if (target.classList.contains('store-toggle') || target.closest('.store-toggle')) {
        const storeToggle = target.classList.contains('store-toggle') ? target : target.closest('.store-toggle');
        const storeId = storeToggle?.getAttribute('data-store-id');
        if (storeId) {
          this.toggleStore(storeId);
        }
      }
      
      // Alert interactions
      if (target.classList.contains('alert-item') || target.closest('.alert-item')) {
        const alertItem = target.classList.contains('alert-item') ? target : target.closest('.alert-item');
        const alertId = alertItem?.getAttribute('data-alert-id');
        if (alertId) {
          this.openAlert(alertId);
        }
      }
    });

    // Network status
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.render();
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.render();
    });

    // Handle URL parameters (deep linking to alerts)
    const urlParams = new URLSearchParams(window.location.search);
    const alertId = urlParams.get('alert');
    if (alertId) {
      setTimeout(() => this.openAlert(alertId), 1000);
    }
  }

  private async switchTab(tab: ViewType): Promise<void> {
    this.state.currentView = tab;
    this.render();
    
    // Initialize map when switching to map view
    if (tab === 'map') {
      setTimeout(async () => {
        await this.initializeMap();
      }, 100);
    }
  }

  private async toggleStore(storeId: string): Promise<void> {
    if (this.state.selectedStores.has(storeId)) {
      this.state.selectedStores.delete(storeId);
    } else {
      this.state.selectedStores.add(storeId);
      
      // Connect to newly selected store
      const store = this.stores.find(s => s.id === storeId);
      if (store) {
        const connected = await this.connectionManager.connectToStore(store);
        store.status = connected ? 'online' : 'offline';
      }
    }
    
    this.saveState();
    this.render();
  }

  private openAlert(alertId: string): void {
    const alert = this.state.alerts.find(a => a.id === alertId);
    if (alert) {
      this.alertManager.markAsRead(alertId);
      this.state.alerts = this.alertManager.getAlerts();
      this.showAlertDetail(alert);
      this.render();
    }
  }

  private showAlertDetail(alert: Alert): void {
    const modal = document.createElement('div');
    modal.className = 'alert-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>${alert.title}</h2>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="alert-severity severity-${alert.severity}">
            ${alert.severity.toUpperCase()}
          </div>
          <div class="alert-time">
            ${formatRelativeTime(alert.timestamp)}
          </div>
          <div class="alert-message">
            ${alert.message.split('\n').map(line => `<p>${line}</p>`).join('')}
          </div>
          ${alert.imageUrl ? `
            <div class="alert-images">
              <div class="image-container">
                <h4>Camera View</h4>
                <img src="${alert.imageUrl}" alt="Alert image" class="alert-image" />
              </div>
            </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn-primary modal-close">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal handlers
    modal.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    });
  }

  private showError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      if (document.body.contains(errorDiv)) {
        document.body.removeChild(errorDiv);
      }
    }, 5000);
  }

  private saveState(): void {
    try {
      const stateToSave = {
        selectedStores: Array.from(this.state.selectedStores),
        currentView: this.state.currentView
      };
      localStorage.setItem('pret-app-state', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save state:', error);
    }
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem('pret-app-state');
      if (saved) {
        const state = JSON.parse(saved);
        this.state.selectedStores = new Set(state.selectedStores || []);
        this.state.currentView = state.currentView || 'stores';
      }
    } catch (error) {
      console.warn('Failed to load saved state:', error);
    }
  }

  private render(): void {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div class="mobile-container">
        ${this.renderHeader()}
        ${this.renderTabNavigation()}
        ${this.renderContent()}
      </div>
    `;
  }

  private renderHeader(): string {
    const unreadCount = this.alertManager.getUnreadCount();
    const onlineStores = this.state.stores.filter(s => s.status === 'online').length;
    
    return `
      <header class="top-nav">
        <div class="nav-brand">
          <div class="brand-logo">🥪</div>
          <span class="brand-text">Pret Monitor</span>
        </div>
        <div class="nav-status">
          <div class="connection-status ${this.state.isOnline ? 'online' : 'offline'}">
            <span class="status-dot"></span>
            <span class="status-text">${onlineStores}/${this.state.stores.length} stores</span>
          </div>
          ${unreadCount > 0 ? `<div class="alert-badge">${unreadCount}</div>` : ''}
        </div>
      </header>
    `;
  }

  private renderTabNavigation(): string {
    const unreadCount = this.alertManager.getUnreadCount();
    
    return `
      <nav class="tab-navigation">
        <button class="tab-btn ${this.state.currentView === 'stores' ? 'active' : ''}" data-tab="stores">
          <span class="tab-icon">🏪</span>
          <span class="tab-label">Stores</span>
        </button>
        <button class="tab-btn ${this.state.currentView === 'map' ? 'active' : ''}" data-tab="map">
          <span class="tab-icon">🗺️</span>
          <span class="tab-label">Map</span>
        </button>
        <button class="tab-btn ${this.state.currentView === 'alerts' ? 'active' : ''}" data-tab="alerts">
          <span class="tab-icon">🚨</span>
          <span class="tab-label">Alerts</span>
          ${unreadCount > 0 ? `<span class="badge">${unreadCount}</span>` : ''}
        </button>
        <button class="tab-btn ${this.state.currentView === 'camera' ? 'active' : ''}" data-tab="camera">
          <span class="tab-icon">📹</span>
          <span class="tab-label">Live Feed</span>
        </button>
      </nav>
    `;
  }

  private renderContent(): string {
    switch (this.state.currentView) {
      case 'stores':
        return this.renderStoresView();
      case 'map':
        return this.renderMapView();
      case 'alerts':
        return this.renderAlertsView();
      case 'camera':
        return this.renderCameraView();
      default:
        return this.renderStoresView();
    }
  }

  private renderStoresView(): string {
    return `
      <main class="content-area">
        <div class="stores-header">
          <h2>Store Locations</h2>
          <p class="stores-subtitle">Select stores to monitor</p>
        </div>
        <div class="stores-list">
          ${this.state.stores.map(store => this.renderStoreCard(store)).join('')}
        </div>
        ${this.state.selectedStores.size > 0 ? `
          <div class="stores-summary">
            <h3>Monitoring ${this.state.selectedStores.size} stores</h3>
            <p class="last-sync">Last updated: ${formatRelativeTime(this.state.lastSync)}</p>
          </div>
        ` : ''}
      </main>
    `;
  }

  private renderStoreCard(store: StoreLocation): string {
    const isSelected = this.state.selectedStores.has(store.id);
    const storeAlerts = this.state.alerts.filter(a => a.storeId === store.id && !a.read);
    
    return `
      <div class="store-card ${isSelected ? 'selected' : ''}" data-store-id="${store.id}">
        <div class="store-toggle" data-store-id="${store.id}">
          <div class="store-info">
            <div class="store-header">
              <h3 class="store-name">${store.name}</h3>
              <div class="store-status status-${store.status}">
                <span class="status-dot"></span>
                <span class="status-text">${store.status}</span>
              </div>
            </div>
            <p class="store-address">${store.address}</p>
            <div class="store-region">${store.region}</div>
          </div>
          <div class="store-actions">
            <div class="toggle-switch ${isSelected ? 'active' : ''}">
              <div class="toggle-thumb"></div>
            </div>
            ${storeAlerts.length > 0 ? `<div class="alert-count">${storeAlerts.length}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderMapView(): string {
    return `
      <main class="content-area">
        <div class="map-header">
          <h2>Store Locations</h2>
          <p class="map-subtitle">Interactive map view</p>
        </div>
        <div id="map-container" class="map-container"></div>
        <div class="map-legend">
          <div class="legend-item">
            <span class="legend-dot online"></span>
            <span>Online</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot offline"></span>
            <span>Offline</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot alert"></span>
            <span>Has Alerts</span>
          </div>
        </div>
      </main>
    `;
  }

  private renderAlertsView(): string {
    const alerts = this.state.alerts.slice(0, 50); // Limit to recent 50
    
    return `
      <main class="content-area">
        <div class="alerts-header">
          <h2>Alert History</h2>
          <div class="alerts-actions">
            <button class="btn-secondary" onclick="app.alertManager.markAllAsRead(); app.render();">
              Mark All Read
            </button>
          </div>
        </div>
        <div class="alerts-list">
          ${alerts.length > 0 ? alerts.map(alert => this.renderAlertCard(alert)).join('') : 
            '<div class="no-alerts">No alerts yet. Monitoring is active.</div>'}
        </div>
      </main>
    `;
  }

  private renderAlertCard(alert: Alert): string {
    return `
      <div class="alert-item ${alert.read ? 'read' : 'unread'}" data-alert-id="${alert.id}">
        <div class="alert-content">
          <div class="alert-header">
            <div class="alert-severity severity-${alert.severity}">
              <span class="severity-dot"></span>
              ${alert.severity}
            </div>
            <div class="alert-time">${formatRelativeTime(alert.timestamp)}</div>
          </div>
          <h3 class="alert-title">${alert.title}</h3>
          <p class="alert-message">${alert.message.split('\n')[0]}</p>
          <div class="alert-location">${alert.location || alert.storeName}</div>
        </div>
        ${alert.imageUrl ? `
          <div class="alert-image-preview">
            <img src="${alert.imageUrl}" alt="Alert preview" />
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderCameraView(): string {
    const selectedStores = Array.from(this.state.selectedStores);
    
    if (selectedStores.length === 0) {
      return `
        <main class="content-area">
          <div class="camera-empty">
            <h2>No Stores Selected</h2>
            <p>Select stores from the Stores tab to view live camera feeds.</p>
          </div>
        </main>
      `;
    }

    return `
      <main class="content-area">
        <div class="camera-header">
          <h2>Live Camera Feeds</h2>
          <p class="camera-subtitle">Real-time view with CV overlays</p>
        </div>
        <div class="camera-grid">
          ${selectedStores.map(storeId => {
            const store = this.state.stores.find(s => s.id === storeId);
            return store ? this.renderCameraFeed(store) : '';
          }).join('')}
        </div>
      </main>
    `;
  }

  private renderCameraFeed(store: StoreLocation): string {
    return `
      <div class="camera-feed">
        <div class="camera-header">
          <h3>${store.name}</h3>
          <div class="camera-status status-${store.status}">
            <span class="status-dot"></span>
            ${store.status}
          </div>
        </div>
        <div class="camera-container" id="camera-${store.id}">
          <div class="camera-loading">Loading camera feed...</div>
        </div>
        <div class="camera-info">
          <span class="camera-location">${store.address}</span>
        </div>
      </div>
    `;
  }
}

// Global app instance
let app: InventoryMonitorApp;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  app = new InventoryMonitorApp();
  // @ts-ignore - Make app globally available for debugging
  window.app = app;
  await app.initialize();
});

// Handle service worker messages
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.type === 'NOTIFICATION_CLICKED') {
      const { alertId } = event.data;
      if (alertId && app) {
        app.openAlert(alertId);
      }
    }
  });
}