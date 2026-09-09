import { useEffect } from 'react';
import { cleanupOldData } from '../utils/cleanupOldData';

export function useDataCleanup() {
  useEffect(() => {
    // Run cleanup when app loads
    const runCleanup = async () => {
      try {
        console.log('Running scheduled data cleanup...');
        await cleanupOldData();
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    };

    // Run immediately on load
    runCleanup();

    // Run cleanup every 24 hours (86400000 ms)
    const interval = setInterval(runCleanup, 86400000);

    return () => clearInterval(interval);
  }, []);
}
