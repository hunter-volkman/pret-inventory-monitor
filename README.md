# Pret Inventory Monitor

> **Real-time inventory monitoring PWA for Pret A Manger locations with smart alerting and mobile-first interface**

![Pret Monitor](https://img.shields.io/badge/Pret-Monitor-red?style=for-the-badge&logo=pwa)
![Viam Apps](https://img.shields.io/badge/Viam-Apps-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)
![PWA](https://img.shields.io/badge/PWA-Ready-green?style=for-the-badge)

## 🎯 Overview

The Pret Inventory Monitor is a mobile-first Progressive Web App built on the Viam Apps platform that provides real-time monitoring of inventory levels and temperature across multiple Pret A Manger store locations. The app delivers intelligent push notifications for empty shelves and temperature alerts, with visual evidence from live camera streams.

### 🔗 Live App
**https://inventorymonitor_pret.viamapplications.com**

## ✨ Features

### 📱 **Mobile-First PWA**
- Responsive design optimized for mobile devices
- Installable on iOS/Android home screens  
- Offline functionality with service worker caching
- Native app-like experience

### 🚨 **Smart Alerting System**
- Real-time push notifications for critical issues
- Empty shelf detection with computer vision
- Temperature monitoring via LoRaWAN sensors
- Smart filtering to prevent false positives
- Visual evidence with camera captures

### 🏪 **Multi-Store Management**
- Connect to multiple Viam machines simultaneously
- Toggle store monitoring on/off
- Real-time connection status indicators
- Store-specific alert filtering

### 🗺️ **Interactive Map**
- OpenStreetMap integration (no API keys required)
- Store locations with status indicators
- Alert badges on map markers
- Auto-zoom to selected stores

### 📹 **Live Camera Feeds**
- Real-time camera streams with CV overlays
- Fill percentage visualizations
- Person detection to avoid false readings
- Grid layout for multiple stores

### 📋 **Alert Management**
- Comprehensive alert history
- Mark as read/unread functionality
- Export/import alert data
- Severity-based filtering and sorting

## 🏗️ Architecture

### **Frontend Stack**
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Vanilla JS/TS** - No framework dependencies for optimal performance
- **CSS Custom Properties** - Modern, maintainable styling
- **Service Worker** - Offline functionality and push notifications

### **Backend Integration**
- **Viam SDK** - Multi-machine connections and sensor data
- **Stock Fill Module** - Computer vision for shelf monitoring
- **LoRaWAN Module** - Temperature sensor network
- **Viam Apps Platform** - Hosting and authentication

### **Real-Time Data Pipeline**
```
Viam Machines → Viam SDK → TypeScript App → Service Worker → Push Notifications
     ↓              ↓            ↓              ↓              ↓
Stock Fill     Camera Feeds   Real-time UI   Offline Cache   Mobile Alerts
LoRaWAN       Sensor Data    State Updates   Background Sync  Native UX
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- Viam CLI installed and authenticated
- Access to Pret store Viam machines

### Installation

```bash
# Clone and setup
git clone <repository-url>
cd pret-inventory-monitor

# Install dependencies
make install

# Start development server
make dev

# Build for production
make build

# Deploy to Viam Apps
make upload
```

### Development Commands

```bash
# Development
make dev          # Start dev server
make dev-mobile   # Start with mobile debugging
make install      # Install dependencies

# Code Quality  
make lint         # Run linter
make format       # Format code
make type-check   # TypeScript checking

# Production
make build        # Build for production
make preview      # Preview production build
make upload       # Deploy to Viam Apps
make deploy       # Full deployment pipeline

# Utilities
make clean        # Clean build artifacts
make fresh        # Clean + fresh install
```

## 📁 Project Structure

```
pret-inventory-monitor/
├── meta.json                 # Viam module configuration
├── Makefile                  # Build automation
├── README.md                 # This file
├── .gitignore               # Git exclusions
└── src/
    └── monitor/
        ├── package.json      # Dependencies
        ├── tsconfig.json     # TypeScript config
        ├── vite.config.js    # Build config
        ├── index.html        # Entry point
        ├── style.css         # Styles
        ├── public/
        │   ├── manifest.json # PWA config
        │   ├── sw.js        # Service Worker
        │   ├── icon-192.png # App icons
        │   ├── icon-512.png
        │   └── offline.html # Offline fallback
        └── src/
            ├── main.ts       # Main application
            ├── types.ts      # TypeScript interfaces
            ├── utils.ts      # Utility functions
            ├── alerts.ts     # Alert management
            ├── camera.ts     # Camera utilities
            ├── map.ts        # Map utilities
            ├── notifications.ts # Push notifications
            └── vite-env.d.ts # Type definitions
```

## 🔧 Configuration

### Store Configuration
Edit the store list in `src/main.ts`:

```typescript
private readonly stores: StoreLocation[] = [
  {
    id: 'store-5th-ave',
    name: 'Pret 5th Avenue', 
    address: '389 5th Ave, New York, NY 10016',
    coords: { lat: 40.7516, lng: -73.9755 },
    machineId: 'a7c5717d-f48e-4ac8-b179-7c7aa73571de', // Your actual machine ID
    status: 'unknown',
    region: 'manhattan'
  }
  // Add more stores...
];
```

### Alert Thresholds
Customize alert sensitivity in `src/main.ts`:

```typescript
private isShelfEmpty(reading: any): boolean {
  return typeof reading.reading === 'number' && reading.reading < 15; // 15% threshold
}

private isTemperatureAlert(reading: any): boolean {
  return typeof reading.reading === 'number' && Math.abs(reading.reading) > 5; // 5°C threshold
}
```

### Notification Settings
Configure push notifications in `src/alerts.ts`:

```typescript
// Customize suppression times to prevent spam
private getSuppressionTime(type: Alert['type']): number {
  const baseTimes = {
    'empty_shelf': 5 * 60 * 1000,      // 5 minutes
    'temperature': 10 * 60 * 1000,     // 10 minutes  
    'equipment_failure': 2 * 60 * 1000  // 2 minutes
  };
  return baseTimes[type] || 5 * 60 * 1000;
}
```

## 📱 Mobile Features

### PWA Installation
The app can be installed on mobile devices:

1. **iOS**: Safari → Share → Add to Home Screen
2. **Android**: Chrome → Menu → Add to Home Screen  
3. **Desktop**: Chrome → Install App button

### Push Notifications
- **iOS**: Works in Safari and installed PWA
- **Android**: Works in Chrome and installed PWA
- **Desktop**: Works in Chrome, Edge, Firefox

### Offline Support
- **Cached Assets**: App works without internet
- **Cached Alerts**: View recent alerts offline
- **Background Sync**: Syncs when connection restored

## 🔒 Security & Privacy

- **No Personal Data**: Only stores alerts and app state
- **Local Storage**: All data stored locally on device
- **Secure Connections**: HTTPS-only communication
- **Viam Authentication**: Uses Viam's secure auth system

## 🎨 Design System

### Color Palette
```css
--primary-red: #e11d2f;        /* Pret brand red */
--primary-dark: #b71c2c;       /* Darker red for hovers */
--accent-green: #10b981;       /* Success/online states */
--warning-orange: #f59e0b;     /* Warning alerts */
--error-red: #ef4444;          /* Critical alerts */
```

### Typography
- **Font**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- **Scale**: 0.75rem to 1.875rem (responsive)
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Spacing
- **Base Unit**: 0.25rem (4px)
- **Scale**: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px

## 🧪 Testing

### Browser Testing
- **Chrome**: Primary development target
- **Safari**: iOS compatibility 
- **Firefox**: Cross-browser validation
- **Edge**: Windows compatibility

### Device Testing
- **iPhone**: 12, 13, 14 series
- **Android**: Samsung Galaxy, Google Pixel
- **Tablet**: iPad, Android tablets
- **Desktop**: 1080p, 1440p, 4K displays

### Performance Targets
- **Load Time**: < 3 seconds on 3G
- **Bundle Size**: < 500KB gzipped
- **Lighthouse Score**: > 90 across all metrics

## 🚨 Troubleshooting

### Common Issues

**"Failed to connect to store"**
- Check machine ID is correct
- Verify Viam credentials are valid
- Ensure machine is online in Viam app

**"Push notifications not working"**
- Grant notification permission in browser
- Check if service worker is registered
- Ensure HTTPS connection (required for notifications)

**"App won't install"**
- Ensure PWA criteria met (HTTPS, manifest, service worker)
- Try different browser (Chrome recommended)
- Clear browser cache and try again

**"Slow performance"**
- Check network connection
- Clear browser storage
- Reduce number of selected stores

### Debug Mode
Enable debug logging:

```javascript
// In browser console
localStorage.setItem('debug', 'true');
location.reload();
```

### Performance Monitoring
Check performance metrics:

```javascript
// In browser console
console.log('Memory usage:', performance.memory);
console.log('Network info:', navigator.connection);
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public functions
- Keep functions small and focused
- Use modern ES6+ features

### Testing Guidelines
- Test on multiple devices/browsers
- Verify offline functionality
- Test push notifications
- Check PWA installation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Viam** - Platform and SDK
- **Pret A Manger** - Use case and requirements
- **OpenStreetMap** - Free mapping data
- **Leaflet** - Interactive maps
- **Community** - Open source libraries and inspiration

## 📞 Support

- **Documentation**: [Viam Apps Docs](https://docs.viam.com)
- **Issues**: Create GitHub issue
- **Discussions**: GitHub Discussions
- **Email**: support@viam.com

---

**Made with ❤️ for Pret A Manger operations teams**

*Real-time monitoring. Smart alerts. Mobile-first experience.*