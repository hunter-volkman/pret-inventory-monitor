// src/camera.ts - Camera stream management
import type { StoreLocation, CameraStream, CameraAnnotation } from './types';

export class CameraManager {
  private streams = new Map<string, CameraStream>();
  
  async initializeCameraStream(store: StoreLocation): Promise<void> {
    try {
      const stream: CameraStream = {
        storeId: store.id,
        isActive: false,
        lastFrame: undefined,
        annotations: []
      };
      
      this.streams.set(store.id, stream);
      console.log(`Camera stream initialized for ${store.name}`);
    } catch (error) {
      console.error(`Failed to initialize camera for ${store.name}:`, error);
    }
  }
  
  getCameraStream(storeId: string): CameraStream | undefined {
    return this.streams.get(storeId);
  }
  
  updateCameraFrame(storeId: string, frameUrl: string, annotations?: CameraAnnotation[]): void {
    const stream = this.streams.get(storeId);
    if (stream) {
      stream.lastFrame = frameUrl;
      stream.annotations = annotations || [];
      stream.isActive = true;
    }
  }
  
  stopCameraStream(storeId: string): void {
    const stream = this.streams.get(storeId);
    if (stream) {
      stream.isActive = false;
    }
  }
}