"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./FocusButton.module.scss";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "next-themes";
import React from "react";

// Add global type declaration for browser
declare global {
  const browser:
    | {
        storage: {
          local: {
            get: (keys?: string | string[] | object) => Promise<any>;
            set: (items: object) => Promise<void>;
          };
          onChanged: {
            addListener: (callback: (changes: any) => void) => void;
            removeListener: (callback: (changes: any) => void) => void;
          };
        };
        runtime: {
          sendMessage: (message: any) => Promise<any>;
        };
        notifications: {
          onClicked: {
            addListener: (callback: (notificationId: string) => void) => void;
            removeListener: (
              callback: (notificationId: string) => void
            ) => void;
          };
          clear: (notificationId: string) => Promise<void>;
        };
        tabs: {
          query: (queryInfo: object) => Promise<any>;
          update: (tabId: number, updateProperties: object) => Promise<any>;
          create: (createProperties: object) => Promise<any>;
        };
        windows: {
          update: (windowId: number, updateInfo: object) => Promise<any>;
        };
      }
    | undefined;
}

const STORAGE_KEY = "focusbutton_timer_state";

interface TimerState {
  time: number;
  isCountingDown: boolean;
  isPaused: boolean;
  startTime: number;
  isFinalState?: boolean;
}

export default function FocusButton() {
  const [mounted, setMounted] = useState(false);
  const [isExtension, setIsExtension] = useState(false);
  const [time, setTime] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<any | null>(null);
  const isTimerEndingRef = useRef<Boolean>(false);
  const stateRestoredRef = useRef<Boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastStateUpdateRef = useRef<number>(0);
  const lastBackgroundStateRef = useRef<any>(null);
  const adjustIntervalRef = useRef<number | null>(null);
  const adjustStartTimeRef = useRef<number | null>(null);
  const lastVisibilityUpdateRef = useRef<number>(0);
  const lastBackgroundUpdateRef = useRef<any>(null);
  const updateThrottleMs = 100;
  const { resolvedTheme, setTheme } = useTheme();

  // Check for extension context after mount
  useEffect(() => {
    const checkExtension =
      typeof window !== "undefined" &&
      typeof chrome !== "undefined" &&
      chrome?.runtime?.id !== undefined;
    setIsExtension(checkExtension);
  }, []);

  // Keep track of current state for comparison
  const currentStateRef = useRef({
    time: 0,
    isCountingDown: false,
    isPaused: false,
    isFinished: false,
  });

  // Update ref whenever state changes
  useEffect(() => {
    currentStateRef.current = {
      time,
      isCountingDown,
      isPaused,
      isFinished,
    };
  }, [time, isCountingDown, isPaused, isFinished]);

  // Track events with GA4
  const trackEvent = (eventName: string, params = {}) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", eventName, {
        ...params,
        source: "FocusButton",
      });
    }
  };

  const sendMessage = useCallback(
    (msg: any) => {
      if (!isExtension) return;

      try {
        console.log("Sending message:", msg);
        chrome.runtime.sendMessage(msg, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError);
            return;
          }
          console.log("Message response:", response);
        });
      } catch (e) {
        console.error("Error sending message:", e);
      }
    },
    [isExtension]
  );

  const handleTimerEnd = useCallback(() => {
    if (isTimerEndingRef.current) {
      return;
    }
    isTimerEndingRef.current = true;

    // Play sound and show notification
    if (!isExtension) {
      playNotificationSound();
      showNotification().catch((error) => {
        console.error("Error showing notification:", error);
      });
    }

    setIsCountingDown(false);
    setIsFinished(true);
    setIsPaused(false);
    setDisplayTime(0);

    if (isExtension) {
      sendMessage({
        type: "TIMER_END",
      });
    } else {
      // Clear web timer state
      localStorage.removeItem(STORAGE_KEY);
    }

    trackEvent("timer_end");

    // Reset the flag after a short delay
    setTimeout(() => {
      isTimerEndingRef.current = false;
    }, 1000);
  }, [isExtension, sendMessage]);

  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext();
      } catch (error) {
        console.error("Error initializing audio:", error);
      }
    }
  }, []);

  const startCountdown = useCallback(
    (duration?: number) => {
      if (duration !== undefined) {
        setTime(duration);
        setDisplayTime(duration);
      }

      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Set state
      setIsCountingDown(true);
      setIsPaused(false);
      setIsFinished(false);

      if (isExtension) {
        // Start local timer for smooth UI updates
        timerRef.current = setInterval(() => {
          setDisplayTime((prevTime) => {
            const newTime = Math.max(0, prevTime - 1);
            return newTime;
          });
        }, 1000);

        // Start background timer
        sendMessage({
          type: "START_TIMER",
          duration: duration || time,
        });
      } else {
        // Web mode - start local timer
        timerRef.current = setInterval(() => {
          setTime((prevTime) => {
            const newTime = Math.max(0, prevTime - 1);
            setDisplayTime(newTime);

            if (newTime === 0) {
              handleTimerEnd();
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return newTime;
          });
        }, 1000);

        // Save state to localStorage
        const state: TimerState = {
          time: duration || time,
          isCountingDown: true,
          isPaused: false,
          startTime: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }

      trackEvent("timer_start", { duration: duration || time });
    },
    [time, isExtension, sendMessage, handleTimerEnd]
  );

  const handleClick = () => {
    if (!isCountingDown && time > 0) {
      startCountdown();
    } else if (isCountingDown && !isPaused) {
      handlePause();
    } else if (isPaused) {
      handleResume();
    }
  };

  const handlePause = () => {
    console.log("Pausing timer");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Set state first
    setIsPaused(true);
    setIsCountingDown(true); // Keep this true for proper button visibility

    // Then update extension
    if (isExtension) {
      sendMessage({ type: "PAUSE_TIMER" });
      // Ensure storage is updated
      chrome.storage.local.set({
        focusbutton_timer_state: {
          type: "TIMER_UPDATE",
          isCountingDown: true,
          time: time,
          isPaused: true,
          source: "ui",
          timestamp: Date.now(),
        },
      });
    } else {
      // Save state to localStorage for web mode
      const state: TimerState = {
        time: time,
        isCountingDown: true,
        isPaused: true,
        startTime: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    trackEvent("timer_pause", { timeLeft: time });
  };

  const handleResume = () => {
    console.log("Resuming timer");

    // Set state first
    setIsPaused(false);
    setIsCountingDown(true);

    if (isExtension) {
      sendMessage({ type: "RESUME_TIMER" });
      // Ensure storage is updated
      chrome.storage.local.set({
        focusbutton_timer_state: {
          type: "TIMER_UPDATE",
          isCountingDown: true,
          time: time,
          isPaused: false,
          source: "ui",
          timestamp: Date.now(),
        },
      });
    } else {
      startCountdown();
    }

    trackEvent("timer_resume", { timeLeft: time });
  };

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load saved state on mount
  useEffect(() => {
    if (!mounted || stateRestoredRef.current) return;

    const loadSavedState = async () => {
      try {
        if (isExtension) {
          const result = await chrome.storage.local.get([
            "focusbutton_timer_state",
          ]);
          const state = result.focusbutton_timer_state;
          if (state) {
            setTime(state.time);
            setDisplayTime(state.time);
            setIsCountingDown(state.isCountingDown);
            setIsPaused(state.isPaused);
            setIsFinished(state.isFinished);

            // Restart countdown if it was running
            if (state.isCountingDown && !state.isPaused && state.time > 0) {
              startCountdown(state.time);
            }
          }
        } else {
          const savedState = localStorage.getItem(STORAGE_KEY);
          if (savedState) {
            const state: TimerState = JSON.parse(savedState);
            if (state.isCountingDown && !state.isPaused) {
              const currentTime = Date.now();
              const elapsedTime = Math.floor(
                (currentTime - state.startTime) / 1000
              );
              const remainingTime = Math.max(0, state.time - elapsedTime);

              if (remainingTime > 0) {
                console.log("Restoring web timer with:", remainingTime);
                setTime(remainingTime);
                setDisplayTime(remainingTime);
                setIsCountingDown(true);
                setIsPaused(false);
                setIsFinished(false);
                startCountdown(remainingTime);
              }
            }
          }
        }
        stateRestoredRef.current = true;
      } catch (error) {
        console.error("Error loading saved state:", error);
      }
    };

    loadSavedState();
  }, [mounted, isExtension]);

  // Track last state update
  const STATE_UPDATE_THROTTLE = 100;

  // Track state updates from background

  // Listen for state changes
  useEffect(() => {
    if (!isExtension) return;

    const handleStorageChange = async (changes: any) => {
      const state = changes.focusbutton_timer_state?.newValue;
      if (state && state.source === "background") {
        lastBackgroundStateRef.current = state;

        // If this is a final state, only update once
        if (state.isFinalState && isFinished) {
          return;
        }

        // Force update state
        setTime(state.time);
        setDisplayTime(state.time);
        setIsCountingDown(state.isCountingDown);
        setIsPaused(state.isPaused);
        setIsFinished(state.isFinished);

        // Log state change
        console.log("State updated from background:", {
          time: state.time,
          isCountingDown: state.isCountingDown,
          isPaused: state.isPaused,
          isFinished: state.isFinished,
        });
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [isExtension, isFinished]);

  // Consolidated state update function
  const updateTimerState = useCallback(() => {
    const now = Date.now();
    if (now - lastStateUpdateRef.current < STATE_UPDATE_THROTTLE) {
      return;
    }

    lastStateUpdateRef.current = now;

    if (!isExtension || !mounted) return;

    // Skip update if this state came from background
    const lastBackgroundState = lastBackgroundStateRef.current;
    if (
      lastBackgroundState &&
      lastBackgroundState.time === time &&
      lastBackgroundState.isCountingDown === isCountingDown &&
      lastBackgroundState.isPaused === isPaused &&
      lastBackgroundState.isFinished === isFinished
    ) {
      return;
    }

    // Don't update if we have a final state
    if (lastBackgroundState?.isFinalState) {
      return;
    }

    console.log("Storing timer state:", {
      isCountingDown,
      time,
      isPaused,
      isFinished,
    });

    const state = {
      type: "TIMER_UPDATE",
      isCountingDown: isCountingDown && time > 0,
      time: time,
      isPaused: isPaused,
      isFinished: isFinished || time === 0,
      source: "ui",
      timestamp: now,
    };

    chrome.storage.local.set({ focusbutton_timer_state: state });
  }, [isExtension, mounted, isCountingDown, time, isPaused, isFinished]);

  // Single effect for state updates
  useEffect(() => {
    if (!mounted) return;

    // Don't update if we have a final state
    if (lastBackgroundStateRef.current?.isFinalState) {
      return;
    }

    if (isCountingDown) {
      updateTimerState();

      const state: TimerState = {
        time,
        isCountingDown,
        isPaused,
        startTime: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else if (!lastBackgroundStateRef.current?.isFinished) {
      // Only update if not a final state from background
      updateTimerState();
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [time, isCountingDown, isPaused, isFinished, mounted, updateTimerState]);

  // Setup storage listener
  useEffect(() => {
    if (!isExtension || !mounted) return;

    console.log("Setting up storage listener");

    const storageListener = (changes: any) => {
      const state = changes.focusbutton_timer_state?.newValue;
      if (!state) return;

      console.log("Storage state updated:", state);

      // Skip if this update was triggered by us and we have a recent update
      const now = Date.now();
      if (
        lastBackgroundStateRef.current?.timestamp &&
        now - lastBackgroundStateRef.current.timestamp < updateThrottleMs
      ) {
        return;
      }

      // Update our reference to latest background state
      lastBackgroundStateRef.current = state;

      setTime(state.time);
      setDisplayTime(state.time);
      setIsCountingDown(state.isCountingDown);
      setIsPaused(state.isPaused);
      setIsFinished(state.isFinished);
    };

    chrome.storage.onChanged.addListener(storageListener);
    return () => chrome.storage.onChanged.removeListener(storageListener);
  }, [isExtension, mounted]);

  // Remove timer message handler since we're using storage
  useEffect(() => {
    if (isExtension) {
      const handleMessage = (message: any) => {
        if (message.type === "PLAY_SOUND") {
          // Skip playing sound in extension mode, handled by offscreen document
          return;
        }
      };

      chrome.runtime.onMessage.addListener(handleMessage);
      return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }
  }, []);

  const playNotificationSound = async () => {
    // Only play sound in web mode, extension handles it via offscreen document
    if (isExtension) {
      return;
    }

    try {
      const audio = new Audio();
      audio.src = "/timer-end.mp3";
      audio.volume = 0.5;

      // Initialize audio context if needed
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // Preload and play
      await audio.load();
      await audio.play().catch((error) => {
        console.log("Audio playback failed:", error);
      });
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  };

  const requestNotificationPermission = async () => {
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

  const showNotification = async (): Promise<void> => {
    // Check if the browser supports notifications
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return;
    }

    try {
      // Check if we need permission
      if (Notification.permission !== "granted") {
        const permission = await requestNotificationPermission();
        if (permission !== "granted") {
          console.log("Notification permission denied");
          return;
        }
      }

      // Show notification
      if (isExtension) {
        // Extension notifications handled by background worker
        return;
      } else {
        // Web notification
        new Notification("Time's up!", {
          body: "Your focus session has ended.",
          icon: "/icons/icon-128.png",
          requireInteraction: true,
          silent: true, // We handle sound separately
        });
      }
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  };

  const sendNotification = async () => {
    // Play sound first
    await playNotificationSound();

    // Then show notification
    await showNotification();
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
    setIsFinished(false);

    // Only request notification permission on up click
    if (adjustment > 0 && Notification.permission === "default") {
      requestNotificationPermission().catch((error) => {
        console.log("Permission request failed:", error);
      });
    }

    trackEvent("timer_adjust", { adjustment });

    // Clear any existing adjustment intervals
    if (adjustIntervalRef.current) {
      clearInterval(adjustIntervalRef.current);
      adjustIntervalRef.current = null;
    }

    adjustStartTimeRef.current = Date.now();
    const initialTime = time;
    let lastUpdateTime = Date.now();
    let lastTime = time;

    const updateDisplay = () => {
      const now = Date.now();
      // Throttle updates to prevent too frequent state changes
      if (now - lastUpdateTime < 50) {
        return;
      }
      lastUpdateTime = now;

      // Add null check for adjustStartTimeRef.current
      const startTime = adjustStartTimeRef.current ?? now;
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const progressInSecond = ((now - startTime) % 1000) / 1000;
      const totalAdjustment =
        elapsedSeconds * 300 + Math.floor(progressInSecond * 300);

      const newTime =
        adjustment > 0
          ? Math.min(initialTime + totalAdjustment, 3600)
          : Math.max(initialTime - totalAdjustment, 0);

      // Stop animation if we've reached 0
      if (newTime === 0 && lastTime > 0) {
        if (adjustIntervalRef.current) {
          clearInterval(adjustIntervalRef.current);
          adjustIntervalRef.current = null;
        }
        setTime(0);
        setDisplayTime(0);

        // For extension mode, explicitly stop the timer
        if (isExtension) {
          sendMessage({ type: "STOP_TIMER" });
          chrome.storage.local.set({
            focusbutton_timer_state: {
              type: "TIMER_UPDATE",
              isCountingDown: false,
              time: 0,
              isPaused: false,
              isFinished: true,
            },
          });
        }
        return;
      }

      lastTime = newTime;

      // Batch state updates together
      setTime(newTime);
      setDisplayTime(newTime);

      // Update extension state
      if (isExtension) {
        chrome.storage.local.set({
          focusbutton_timer_state: {
            type: "TIMER_UPDATE",
            isCountingDown: false,
            time: newTime,
            isPaused: false,
            isFinished: false,
          },
        });
      }
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

    // Only start countdown if time is greater than 0
    if (time > 0) {
      startCountdown();
    }
  };

  const handleVisibilityChange = useCallback(
    (now: number) => {
      if (document.hidden) {
        // App going to background
        if (isCountingDown && !isPaused && timerRef.current) {
          console.log("App going to background, saving timer state");
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
              console.log("App coming to foreground, restoring timer state");
              const elapsedSeconds = Math.floor((now - startTime) / 1000);
              const newTime = Math.max(0, timeLeft - elapsedSeconds);

              if (newTime === 0) {
                console.log("Timer completed while in background");
                handleTimerEnd();
              } else if (newTime > 0) {
                // Resume countdown if time remaining
                startCountdown(newTime);
              }
            }
          } catch (error) {
            console.error("Error parsing saved timer:", error);
          }
          localStorage.removeItem("focusTimer");
        }
      }
    },
    [time, isCountingDown, startCountdown, handleTimerEnd]
  );

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

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChangeWrapper
    );
    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChangeWrapper
      );
    };
  }, [handleVisibilityChange]);

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

  useEffect(() => {
    if (isExtension) {
      const handleMessage = (message: any) => {
        if (message.type === "PLAY_SOUND") {
          // Skip playing sound in extension mode, handled by offscreen document
          return;
        }
      };

      chrome.runtime.onMessage.addListener(handleMessage);
      return () => {
        chrome.runtime.onMessage.removeListener(handleMessage);
      };
    }
  }, []);

  useEffect(() => {
    if (isExtension) {
      const handleNotificationClick = async (notificationId: string) => {
        // Clear notification
        await chrome.notifications.clear(notificationId);

        // Focus or create tab
        const tabs = await chrome.tabs.query({
          url: chrome.runtime.getURL("/index.html"),
        });
        if (tabs.length > 0 && tabs[0].id !== undefined) {
          await chrome.tabs.update(tabs[0].id, { active: true });
          await chrome.windows.update(tabs[0].windowId, { focused: true });
        } else {
          await chrome.tabs.create({ url: "/index.html", active: true });
        }
      };

      chrome.notifications.onClicked.addListener(handleNotificationClick);
      return () =>
        chrome.notifications.onClicked.removeListener(handleNotificationClick);
    }
  }, []);

  useEffect(() => {
    // Store timer state for background script
    if (isExtension) {
      // Debounce storage updates
      const timeoutId = setTimeout(() => {
        console.log("Storing timer state:", {
          isCountingDown,
          time,
          isPaused,
          isFinished,
        });
        chrome.storage.local.set({
          focusbutton_timer_state: {
            type: "TIMER_UPDATE",
            isCountingDown: isCountingDown && time > 0,
            time: time,
            isPaused: isPaused,
            isFinished: isFinished || time === 0,
          },
        });
      }, 100); // 100ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [isExtension, isCountingDown, time, isPaused, isFinished]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle ESC key for cancel
      if (event.key === "Escape") {
        event.preventDefault();
        if (isCountingDown || time > 0) {
          handleCancel();
        }
        return;
      }

      // Prevent default behavior for arrow keys
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();

        // Only handle if not counting down and no adjustment is in progress
        if (!adjustIntervalRef.current) {
          if (event.key === "ArrowUp") {
            startAdjustment(60);
          } else if (event.key === "ArrowDown" && time > 0) {
            startAdjustment(-60);
          }
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        if (adjustIntervalRef.current) {
          stopAdjustment();
        }
      }
    };

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isCountingDown, time, startAdjustment, stopAdjustment]);

  // Check timer state on mount
  useEffect(() => {
    if (isExtension) {
      chrome.runtime.sendMessage({ type: "GET_TIMER_STATE" }, (response) => {
        if (response.running) {
          setTime(response.remainingTime);
          setDisplayTime(response.remainingTime);
          setIsCountingDown(true);
          startCountdown(response.remainingTime);
        }
      });
    }
  }, []);

  // Handle cancel button click
  const handleCancel = () => {
    if (isExtension) {
      // Send stop message to background worker
      sendMessage({
        type: "STOP_TIMER",
      });

      // Also update local state immediately for better UX
      setTime(0);
      setDisplayTime(0);
      setIsCountingDown(false);
      setIsPaused(false);
      setIsFinished(true);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTime(0);
      setDisplayTime(0);
      setIsCountingDown(false);
      setIsPaused(false);
      setIsFinished(true);

      // Clear localStorage state
      localStorage.removeItem(STORAGE_KEY);
    }
    trackEvent("timer_cancel");
  };

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
