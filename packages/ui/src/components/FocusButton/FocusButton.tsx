"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./FocusButton.module.scss";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "next-themes";
import React from "react";

const STORAGE_KEY = "focusbutton_timer_state";

interface TimerState {
  time: number;
  isCountingDown: boolean;
  isPaused: boolean;
  startTime: number;
}

export default function FocusButton() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const adjustIntervalRef = useRef<number | null>(null);
  const adjustStartTimeRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const lastVisibilityUpdateRef = useRef<number>(0);
  const { resolvedTheme, setTheme } = useTheme();

  const isSafari = () => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  };

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load saved state on mount
  useEffect(() => {
    if (!mounted) return;

    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const state: TimerState = JSON.parse(savedState);
      const currentTime = Date.now();
      const elapsedSeconds = (currentTime - state.startTime) / 1000;

      if (state.isCountingDown && !state.isPaused) {
        const remainingTime = Math.max(0, state.time - elapsedSeconds);
        setTime(remainingTime);
        setDisplayTime(remainingTime);
        setIsCountingDown(true);
        if (remainingTime > 0) {
          startCountdown();
        }
      } else if (state.isPaused) {
        setTime(state.time);
        setDisplayTime(state.time);
        setIsCountingDown(true);
        setIsPaused(true);
      }
    }
    audioRef.current = new Audio("/timer-end.mp3");
  }, [mounted]);

  // Initialize audio on mount
  useEffect(() => {
    if (!mounted) return;

    // Create and configure audio element
    const audio = new Audio("/timer-end.mp3");
    audio.preload = "auto";
    audioRef.current = audio;

    // Initialize Web Audio API context
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.log("Web Audio API not supported");
    }

    // On iOS, we need to play (and immediately pause) after user interaction
    const initAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current?.load();
        }).catch(error => {
          console.log("Initial audio play failed (expected):", error);
        });
      }
      
      // Also resume audio context if available
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    // Add listeners for user interaction
    const interactionEvents = ["touchstart", "click"];
    interactionEvents.forEach(event => {
      document.addEventListener(event, initAudio, { once: true });
    });

    return () => {
      interactionEvents.forEach(event => {
        document.removeEventListener(event, initAudio);
      });
      if (audioRef.current) {
        audioRef.current = null;
      }
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [mounted]);

  const playFallbackSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (audioContextRef.current) {
        // Create and configure oscillator
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime); // A4 note
        
        gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 1);

        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        oscillator.start();
        oscillator.stop(audioContextRef.current.currentTime + 1);

        oscillatorRef.current = oscillator;
      }
    } catch (error) {
      console.log("Fallback sound failed:", error);
    }
  };

  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        // Reset the audio to start
        audioRef.current.currentTime = 0;
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log("Sound playback error (expected on iOS background):", error);
            // On iOS background, sound won't play - this is expected behavior
          });
        }
      }
    } catch (error) {
      console.error("Error playing notification:", error);
    }
  };

  const requestNotificationPermission = async () => {
    // Skip notification permission request for Safari
    if (isSafari()) {
      return "denied";
    }

    if (!("Notification" in window)) {
      return "denied";
    }

    try {
      return await Notification.requestPermission();
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  };

  const sendNotification = async () => {
    try {
      // Don't even try notifications on iOS/Safari
      if (isSafari()) {
        return;
      }

      // Check if we're in a PWA/standalone mode
      const isStandalone = window.matchMedia(
        "(display-mode: standalone)"
      ).matches;
      if (isStandalone) {
        // In PWA mode, just play sound
        playNotificationSound();
        return;
      }

      // For regular web, try system notification
      if (Notification.permission === "granted") {
        try {
          const notification = new Notification("Time's up!", {
            body: "Your focus time is complete.",
            icon: "/icon.png",
            silent: true, // We'll handle sound separately
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (error) {
          console.log("Notification creation error:", error);
          // Fallback to sound
          playNotificationSound();
        }
      } else {
        // If no notification permission, just play sound
        playNotificationSound();
      }
    } catch (error) {
      console.log("Notification error (expected on some platforms):", error);
      // Always ensure sound plays as fallback
      playNotificationSound();
    }
  };

  const formatTimeValues = (totalSeconds: number) => {
    const minutes = Math.max(0, Math.floor(totalSeconds / 60));
    const seconds = Math.max(0, Math.floor(totalSeconds % 60));
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const buttonRef = useRef<HTMLButtonElement>(null);

  const startAdjustment = (adjustment: number) => {
    // Stop any existing countdown
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsCountingDown(false);
    setIsPaused(false);
    setIsFinished(false); // Remove finished state when adjusting time

    if (adjustment > 0 && notificationPermission === "default") {
      requestNotificationPermission().then(() => {
        console.log("Permission after request:", Notification.permission);
      });
    }

    // Clear any existing adjustment intervals
    if (adjustIntervalRef.current) {
      clearInterval(adjustIntervalRef.current);
      adjustIntervalRef.current = null;
    }

    adjustStartTimeRef.current = Date.now();
    const initialTime = time;
    let lastUpdateTime = Date.now();

    const updateDisplay = () => {
      const now = Date.now();
      // Throttle updates to prevent too frequent state changes
      if (now - lastUpdateTime < 50) {
        return;
      }
      lastUpdateTime = now;

      const elapsedSeconds = Math.floor(
        (now - adjustStartTimeRef.current) / 1000
      );
      const progressInSecond =
        ((now - adjustStartTimeRef.current) % 1000) / 1000;
      const totalAdjustment =
        elapsedSeconds * 300 + Math.floor(progressInSecond * 300);

      const newTime =
        adjustment > 0
          ? Math.min(initialTime + totalAdjustment, 3600)
          : Math.max(initialTime - totalAdjustment, 0);

      // Batch state updates together
      setTime(newTime);
      setDisplayTime(newTime);
    };

    // Use requestAnimationFrame for smoother updates
    const animate = () => {
      if (!adjustIntervalRef.current) return;
      updateDisplay();
      requestAnimationFrame(animate);
    };

    adjustIntervalRef.current = window.setInterval(() => {}, 1000); // Keep interval alive
    requestAnimationFrame(animate);
  };

  const stopAdjustment = () => {
    if (adjustIntervalRef.current) {
      clearInterval(adjustIntervalRef.current);
      adjustIntervalRef.current = null;
    }
    setDisplayTime(time);

    // Start countdown if time is greater than 0
    if (time > 0) {
      startCountdown();
    }
  };

  const handleClick = () => {
    if (!isCountingDown && time > 0) {
      startCountdown();
    } else if (isCountingDown && !isPaused) {
      handlePause();
    } else if (isPaused) {
      startCountdown();
    }
  };

  const startCountdown = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const startTime = Date.now();
    localStorage.setItem(
      "focusTimer",
      JSON.stringify({
        timeLeft: time,
        startTime,
        isCountingDown: true,
        isPaused: false,
      })
    );

    const countdownInterval = setInterval(() => {
      setTime((prevTime) => {
        if (prevTime <= 0) {
          clearInterval(countdownInterval);
          setIsCountingDown(false);
          setIsPaused(false);
          setIsFinished(true);

          // Always try to play sound first
          playNotificationSound();
          // Then attempt notification as secondary feedback
          sendNotification().catch(() => {
            // Error already logged in sendNotification
          });

          localStorage.removeItem("focusTimer");
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    timerRef.current = countdownInterval;
    setIsCountingDown(true);
    setIsPaused(false);
  };

  // Handle visibility change and background time tracking
  const handleVisibilityChange = useCallback((now: number) => {
    if (document.hidden) {
      // App going to background
      if (isCountingDown && !isPaused && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        localStorage.setItem(
          "focusTimer",
          JSON.stringify({
            timeLeft: time,
            startTime: now,
            isCountingDown: true,
            isPaused: false,
          })
        );
      }
    } else {
      // App coming to foreground
      const savedTimer = localStorage.getItem("focusTimer");
      if (savedTimer) {
        try {
          const {
            timeLeft,
            startTime,
            isCountingDown: wasCountingDown,
            isPaused: wasPaused,
          } = JSON.parse(savedTimer);
          if (wasCountingDown && !wasPaused) {
            const elapsedSeconds = Math.floor((now - startTime) / 1000);
            const newTimeLeft = Math.max(0, timeLeft - elapsedSeconds);
            setTime(newTimeLeft);

            if (newTimeLeft === 0) {
              setIsCountingDown(false);
              setIsPaused(false);
              setIsFinished(true);
              // Play sound when coming back to foreground if timer finished
              playNotificationSound();
            } else {
              startCountdown();
            }
          }
        } catch (error) {
          console.error("Error parsing saved timer:", error);
        }
        localStorage.removeItem("focusTimer");
      }
    }
  }, [isCountingDown, isPaused, time, startCountdown]);

  useEffect(() => {
    const handleVisibilityChangeWrapper = () => {
      const now = Date.now();
      // Prevent multiple updates within 1 second
      if (now - lastVisibilityUpdateRef.current < 1000) {
        return;
      }
      lastVisibilityUpdateRef.current = now;

      handleVisibilityChange(now);
    };

    document.addEventListener("visibilitychange", handleVisibilityChangeWrapper);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChangeWrapper);
    };
  }, [handleVisibilityChange]);

  const handlePause = () => {
    console.log("Pausing timer");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPaused(true);
  };

  const handleCancel = () => {
    console.log("Canceling timer");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTime(0);
    setDisplayTime(0);
    setIsCountingDown(false);
    setIsPaused(false);
    setIsFinished(false); // Remove finished state when canceling
  };

  // Remove finished state after animation or when timer is adjusted
  useEffect(() => {
    if (isFinished) {
      const timer = setTimeout(() => {
        setIsFinished(false);
      }, 500); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isFinished]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (adjustIntervalRef.current) clearInterval(adjustIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    // Function to get or create the meta tag
    const getOrCreateThemeMetaTag = () => {
      let meta = document.querySelector(
        "meta[name='theme-color']"
      ) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      return meta;
    };

    const getOrCreateBackgroundMetaTag = () => {
      let meta = document.querySelector(
        "meta[name='background-color']"
      ) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "background-color";
        document.head.appendChild(meta);
      }
      return meta;
    };

    const themeMeta = getOrCreateThemeMetaTag();
    themeMeta.content = resolvedTheme === "dark" ? "#000000" : "#ffffff";

    const backgroundMeta = getOrCreateBackgroundMetaTag();
    backgroundMeta.content = resolvedTheme === "dark" ? "#000000" : "#ffffff";
  }, [resolvedTheme]);

  // Register service worker and update notification permission state
  useEffect(() => {
    if (!mounted) return;

    // Update initial notification permission state
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered successfully");

          // Check if we have an active service worker
          if (registration.active) {
            console.log("Service Worker is already active");
          } else {
            console.log("Waiting for Service Worker to activate");
            registration.addEventListener("activate", () => {
              console.log("Service Worker activated");
            });
          }
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, [mounted]);

  // Save state on changes
  useEffect(() => {
    if (!mounted) return;

    if (isCountingDown) {
      const state: TimerState = {
        time,
        isCountingDown,
        isPaused,
        startTime: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [time, isCountingDown, isPaused, mounted]);

  // Sync display time with actual time
  useEffect(() => {
    setDisplayTime(time);
  }, [time]);

  // Don't render anything until mounted
  if (!mounted) {
    return;
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div
          className={`${styles.focusButton} ${
            isCountingDown ? styles.counting : ""
          } ${isPaused ? styles.paused : ""} ${
            isFinished ? styles.finished : ""
          }`}
        >
          <div className={styles.timeDisplay}>
            <button
              className={styles.timeAdjust}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.stopPropagation();
                startAdjustment(-1);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                stopAdjustment();
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                stopAdjustment();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                startAdjustment(-1);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                stopAdjustment();
              }}
            >
              <ChevronDown size={16} />
            </button>

            <span
              className={styles.time}
              onClick={(e) => {
                e.stopPropagation();
                setTheme(resolvedTheme === "dark" ? "light" : "dark");
              }}
            >
              {formatTimeValues(displayTime)}
            </span>

            <button
              className={styles.timeAdjust}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.stopPropagation();
                startAdjustment(1);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                stopAdjustment();
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                stopAdjustment();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                startAdjustment(1);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                stopAdjustment();
              }}
            >
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
        <div
          className={`${styles.controls} ${
            isCountingDown && time > 0 ? styles.visible : ""
          }`}
        >
          <button onClick={handleClick}>{isPaused ? "Resume" : "Pause"}</button>
          <button onClick={handleCancel}>Cancel</button>
        </div>
      </main>
    </div>
  );
}
