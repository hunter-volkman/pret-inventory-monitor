/// <reference types="vite/client" />

// Vite environment variables
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_BUILD_TIME: string
  readonly VITE_VIAM_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global app variables injected by Vite
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

// Leaflet global (loaded via CDN)
declare global {
  interface Window {
    L: typeof import('leaflet');
    app: any; // Global app instance for debugging
  }
}

// Service Worker types
interface ServiceWorkerGlobalScope {
  clients: Clients;
  registration: ServiceWorkerRegistration;
  skipWaiting(): Promise<void>;
}

// Push notification types
interface PushEvent extends ExtendableEvent {
  data: PushMessageData | null;
}

interface NotificationEvent extends ExtendableEvent {
  notification: Notification;
  action: string;
}

// PWA types
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Navigator {
  setAppBadge?(count?: number): Promise<void>;
  clearAppBadge?(): Promise<void>;
}

// Network information API
interface NetworkInformation {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

// Memory info
interface MemoryInfo {
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface Performance {
  memory?: MemoryInfo;
}

// Web Share API
interface Navigator {
  share?(data: ShareData): Promise<void>;
}

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

// Wake Lock API
interface Navigator {
  wakeLock?: WakeLock;
}

interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

interface WakeLockSentinel {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: EventListener): void;
  removeEventListener(type: 'release', listener: EventListener): void;
}

// Screen Orientation API
interface ScreenOrientation {
  lock(orientation: OrientationLockType): Promise<void>;
  unlock(): void;
  type: OrientationType;
  angle: number;
}

interface Screen {
  orientation?: ScreenOrientation;
}

// Visual Viewport API
interface VisualViewport extends EventTarget {
  offsetLeft: number;
  offsetTop: number;
  pageLeft: number;
  pageTop: number;
  width: number;
  height: number;
  scale: number;
}

interface Window {
  visualViewport?: VisualViewport;
}

// Device Memory API
interface Navigator {
  deviceMemory?: number;
}

// Battery API
interface Navigator {
  getBattery?(): Promise<BatteryManager>;
}

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

// Geolocation API extensions
interface GeolocationCoordinates {
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  latitude: number;
  longitude: number;
  speed: number | null;
}

// File System Access API
interface Window {
  showOpenFilePicker?(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  showDirectoryPicker?(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
}

interface OpenFilePickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: FilePickerAcceptType[];
}

interface SaveFilePickerOptions {
  excludeAcceptAllOption?: boolean;
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

interface DirectoryPickerOptions {
  id?: string;
  mode?: 'read' | 'readwrite';
  startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string | string[]>;
}

interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  keys(): AsyncIterableIterator<string>;
  values(): AsyncIterableIterator<FileSystemHandle>;
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: FileSystemWriteChunkType): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

type FileSystemWriteChunkType = BufferSource | Blob | string | WriteParams;

interface WriteParams {
  type: 'write' | 'seek' | 'truncate';
  data?: BufferSource | Blob | string;
  position?: number;
  size?: number;
}

// Intersection Observer API
interface IntersectionObserverEntry {
  boundingClientRect: DOMRectReadOnly;
  intersectionRatio: number;
  intersectionRect: DOMRectReadOnly;
  isIntersecting: boolean;
  rootBounds: DOMRectReadOnly | null;
  target: Element;
  time: number;
}

// Resize Observer API
interface ResizeObserverEntry {
  borderBoxSize: ResizeObserverSize[];
  contentBoxSize: ResizeObserverSize[];
  contentRect: DOMRectReadOnly;
  devicePixelContentBoxSize: ResizeObserverSize[];
  target: Element;
}

interface ResizeObserverSize {
  blockSize: number;
  inlineSize: number;
}

// Performance Observer API
interface PerformanceEntry {
  duration: number;
  entryType: string;
  name: string;
  startTime: number;
  toJSON(): any;
}

interface PerformanceNavigationTiming extends PerformanceEntry {
  connectEnd: number;
  connectStart: number;
  domComplete: number;
  domContentLoadedEventEnd: number;
  domContentLoadedEventStart: number;
  domInteractive: number;
  domainLookupEnd: number;
  domainLookupStart: number;
  fetchStart: number;
  loadEventEnd: number;
  loadEventStart: number;
  redirectCount: number;
  redirectEnd: number;
  redirectStart: number;
  requestStart: number;
  responseEnd: number;
  responseStart: number;
  secureConnectionStart: number;
  type: 'navigate' | 'reload' | 'back_forward' | 'prerender';
  unloadEventEnd: number;
  unloadEventStart: number;
}

// Web Locks API
interface Navigator {
  locks?: LockManager;
}

interface LockManager {
  request(name: string, callback: (lock: Lock) => Promise<any>): Promise<any>;
  request(name: string, options: LockOptions, callback: (lock: Lock) => Promise<any>): Promise<any>;
  query(): Promise<LockManagerSnapshot>;
}

interface LockOptions {
  mode?: 'shared' | 'exclusive';
  ifAvailable?: boolean;
  steal?: boolean;
  signal?: AbortSignal;
}

interface Lock {
  name: string;
  mode: 'shared' | 'exclusive';
}

interface LockManagerSnapshot {
  held: Lock[];
  pending: Lock[];
}

// WebRTC types for potential future camera streaming
interface RTCPeerConnection {
  createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>;
  createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(description?: RTCSessionDescriptionInit): Promise<void>;
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
  addIceCandidate(candidate?: RTCIceCandidateInit): Promise<void>;
}

// Custom event types for the app
interface CustomEventMap {
  'store-connected': CustomEvent<{ storeId: string }>;
  'store-disconnected': CustomEvent<{ storeId: string }>;
  'alert-created': CustomEvent<{ alert: import('./types').Alert }>;
  'alert-read': CustomEvent<{ alertId: string }>;
  'notification-permission-changed': CustomEvent<{ granted: boolean }>;
  'network-status-changed': CustomEvent<{ isOnline: boolean }>;
  'app-state-changed': CustomEvent<{ state: import('./types').AppState }>;
}

declare global {
  interface WindowEventMap extends CustomEventMap {}
}

// Module declarations for external libraries
declare module 'leaflet' {
  // Leaflet types are already well-defined, but we can extend if needed
  interface Map {
    pm?: any; // For leaflet.pm plugin if we add it later
  }
}

// CSS custom properties for TypeScript
declare module 'csstype' {
  interface Properties {
    '--primary-red'?: string;
    '--primary-dark'?: string;
    '--accent-green'?: string;
    '--accent-blue'?: string;
    '--warning-orange'?: string;
    '--error-red'?: string;
    '--gray-50'?: string;
    '--gray-100'?: string;
    '--gray-200'?: string;
    '--gray-300'?: string;
    '--gray-400'?: string;
    '--gray-500'?: string;
    '--gray-600'?: string;
    '--gray-700'?: string;
    '--gray-800'?: string;
    '--gray-900'?: string;
  }
}

export {};