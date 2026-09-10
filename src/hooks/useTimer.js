import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useTimer custom hook
 * Manages the countdown state and timer ticks for Regain focus sessions.
 */
export function useTimer(onComplete) {
  // 1. Initial State Recovery from LocalStorage
  const getInitialDuration = () => {
    const savedSetting = localStorage.getItem('regain-timer-setting') || '20';
    const savedCustom = localStorage.getItem('regain-custom-duration') || '12';
    
    if (savedSetting === 'custom') {
      return (parseInt(savedCustom) || 20) * 60;
    }
    return (parseInt(savedSetting) || 20) * 60;
  };

  const [duration, setDuration] = useState(getInitialDuration);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  
  const timerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  // Keep complete callback updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 2. Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 3. Main Countdown Tick Effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            setIsRunning(false);
            clearInterval(timerRef.current);
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
            return duration; // Reset to full duration upon completion
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, duration]);

  // 4. Expose Hook API Functions
  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(duration);
  }, [duration]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(duration);
  }, [duration]);

  const setDefaultDuration = useCallback((minutes) => {
    const seconds = minutes * 60;
    setDuration(seconds);
    setTimeLeft(seconds);
    setIsRunning(false);
  }, []);

  const adjustDuration = useCallback((deltaMinutes) => {
    if (isRunning) return; // Prevent adjustments during active session
    
    setTimeLeft((prevTime) => {
      const currentMinutes = Math.floor(prevTime / 60);
      const newMinutes = currentMinutes + deltaMinutes;
      
      if (newMinutes >= 1 && newMinutes <= 120) {
        const newSeconds = newMinutes * 60;
        setDuration(newSeconds);
        return newSeconds;
      }
      return prevTime;
    });
  }, [isRunning]);

  // Helpers
  const getFormattedTime = useCallback(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  const getProgress = useCallback(() => {
    return (duration - timeLeft) / duration;
  }, [duration, timeLeft]);

  return {
    duration,
    timeLeft,
    isRunning,
    start,
    pause,
    stop,
    reset,
    setDefaultDuration,
    adjustDuration,
    getFormattedTime,
    getProgress
  };
}

export default useTimer;
