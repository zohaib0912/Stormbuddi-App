import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing page loading state with minimum display time
 * Ensures loader is shown for at least 2 seconds to prevent flickering
 */
const usePageLoader = (initialLoading = false, minimumDisplayTime = 2000) => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [startTime, setStartTime] = useState(null);
  const [shouldShowLoader, setShouldShowLoader] = useState(initialLoading);

  // Start loading
  const startLoading = useCallback(() => {
    setIsLoading(true);
    setStartTime(Date.now());
    setShouldShowLoader(true);
  }, []);

  // Stop loading (respects minimum display time)
  const stopLoading = useCallback(() => {
    setIsLoading(false);
    
    if (startTime) {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minimumDisplayTime - elapsedTime);
      
      if (remainingTime > 0) {
        // Wait for remaining time before hiding loader
        setTimeout(() => {
          setShouldShowLoader(false);
        }, remainingTime);
      } else {
        // Minimum time already passed, hide immediately
        setShouldShowLoader(false);
      }
    } else {
      // No start time recorded, hide immediately
      setShouldShowLoader(false);
    }
  }, [startTime, minimumDisplayTime]);

  // Reset loader state
  const resetLoader = useCallback(() => {
    setIsLoading(false);
    setStartTime(null);
    setShouldShowLoader(false);
  }, []);

  // Set loading state directly
  const setLoading = useCallback((loading) => {
    if (loading) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading,
    shouldShowLoader,
    startLoading,
    stopLoading,
    resetLoader,
    setLoading,
  };
};

export default usePageLoader;
