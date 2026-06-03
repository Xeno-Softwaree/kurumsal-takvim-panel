import { useEffect, useState } from 'react';

interface OfflineStorage {
  events: any[];
  lastSync: string;
}

export function useOfflineSupport() {
  const [isOnline, setIsOnline] = useState(true); // Geçici olarak always online
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isServiceWorkerEnabled, setIsServiceWorkerEnabled] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service Worker kaydet (geçici olarak devre dışı)
    if (false && 'serviceWorker' in navigator && isServiceWorkerEnabled) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }

    // Load last sync time
    const stored = localStorage.getItem('offlineStorage');
    if (stored) {
      try {
        const data: OfflineStorage = JSON.parse(stored);
        setLastSync(data.lastSync);
      } catch (e) {
        console.error('Failed to parse offline storage:', e);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isServiceWorkerEnabled]);

  const saveToOffline = (data: any[]) => {
    if (!isServiceWorkerEnabled) return;
    
    try {
      const offlineData: OfflineStorage = {
        events: data,
        lastSync: new Date().toISOString(),
      };
      
      localStorage.setItem('offlineStorage', JSON.stringify(offlineData));
      setLastSync(offlineData.lastSync);
    } catch (e) {
      console.error('Failed to save to offline storage:', e);
    }
  };

  const getOfflineData = (): any[] => {
    if (!isServiceWorkerEnabled) return [];
    
    try {
      const stored = localStorage.getItem('offlineStorage');
      if (!stored) return [];
      
      const data: OfflineStorage = JSON.parse(stored);
      return data.events || [];
    } catch (e) {
      console.error('Failed to parse offline storage:', e);
      return [];
    }
  };

  const clearOfflineData = () => {
    localStorage.removeItem('offlineStorage');
    setLastSync(null);
  };

  return {
    isOnline,
    lastSync,
    saveToOffline,
    getOfflineData,
    clearOfflineData,
    isServiceWorkerEnabled,
    enableServiceWorker: () => setIsServiceWorkerEnabled(true),
    disableServiceWorker: () => setIsServiceWorkerEnabled(false),
  };
}