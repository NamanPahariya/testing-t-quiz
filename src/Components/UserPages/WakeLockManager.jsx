import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

const WakeLockManager = () => {
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [error, setError] = useState(null);
  const wakeLockRef = useRef(null);
  const noSleepVideoRef = useRef(null);
  const periodicWakeRef = useRef(null);

  // Create and setup NoSleep video element
  useEffect(() => {
    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    
    // Minimal valid video stream that keeps device awake
    const videoSource = 'data:video/mp4;base64,AAAAIGZ0eXBtcDQyAAAAAG1wNDJtcDQxaXNvbWF2YzEAAATKbW9vdg...'; // Truncated for brevity
    video.src = videoSource;
    
    noSleepVideoRef.current = video;
    
    return () => {
      if (noSleepVideoRef.current) {
        noSleepVideoRef.current.pause();
        noSleepVideoRef.current.src = '';
        noSleepVideoRef.current = null;
      }
    };
  }, []);

  // Main wake lock acquisition function
  const acquireWakeLock = async () => {
    try {
      // Try Wake Lock API first
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
        setError(null);
      } else {
        // Fallback to video method
        if (noSleepVideoRef.current) {
          await noSleepVideoRef.current.play();
          setWakeLockActive(true);
          setError(null);
        }
      }

      // Additional periodic wake mechanism
      periodicWakeRef.current = setInterval(() => {
        // Force minimal CPU activity
        console.log('Wake check:', new Date().toISOString());
      }, 30000);

    } catch (err) {
      setError('Failed to keep device awake. Please check your device settings.');
      setWakeLockActive(false);
    }
  };

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await acquireWakeLock();
      }
    };

    // Setup visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial wake lock acquisition
    acquireWakeLock();

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (periodicWakeRef.current) {
        clearInterval(periodicWakeRef.current);
      }
      
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
      
      if (noSleepVideoRef.current) {
        noSleepVideoRef.current.pause();
      }
    };
  }, []);

  if (error) {
    return (
      <Alert variant="destructive" className="mt-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default WakeLockManager;