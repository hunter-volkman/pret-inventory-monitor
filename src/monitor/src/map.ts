// src/map.ts - Map utilities and extensions
import type { StoreLocation, Alert } from './types';

export class MapUtils {
  static calculateBounds(stores: StoreLocation[]): [[number, number], [number, number]] | null {
    if (stores.length === 0) return null;
    
    const lats = stores.map(s => s.coords.lat);
    const lngs = stores.map(s => s.coords.lng);
    
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ];
  }
  
  static getMapCenter(stores: StoreLocation[]): [number, number] {
    if (stores.length === 0) return [40.7589, -73.9851]; // NYC default
    
    const avgLat = stores.reduce((sum, s) => sum + s.coords.lat, 0) / stores.length;
    const avgLng = stores.reduce((sum, s) => sum + s.coords.lng, 0) / stores.length;
    
    return [avgLat, avgLng];
  }
  
  static createMarkerHTML(store: StoreLocation, alertCount: number, color: string): string {
    return `
      <div class="marker-container" style="background-color: ${color}">
        <span class="marker-icon">🏪</span>
        ${alertCount > 0 ? `<span class="marker-badge">${alertCount}</span>` : ''}
      </div>
    `;
  }
}