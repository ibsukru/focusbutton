"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./FocusButton.module.scss";
import {
  ChevronDown,
  ChevronUp,
  CirclePause,
  CirclePlay,
  CircleX,
  Moon,
  Sun,
} from "lucide-react";
import type { BrowserAPIType } from "@focusbutton/extension/src/browser-api";
import { useTheme } from "next-themes";
import clsx from "clsx";
import NumberFlow from "@number-flow/react";

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
          onMessage: {
            addListener: (
              callback: (message: any, sender: any, sendResponse: any) => void,
            ) => void;
            removeListener: (
              callback: (message: any, sender: any, sendResponse: any) => void,
            ) => void;
          };
        };
        notifications: {
          onClicked: {
            addListener: (callback: (notificationId: string) => void) => void;
            removeListener: (
              callback: (notificationId: string) => void,
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

interface TimerState {
  time: number;
  isCountingDown: boolean;
  isPaused: boolean;
  isFinished: boolean;
  source?: string;
  timestamp?: number;
  startTime: number;
  isFinalState?: boolean;
  isCanceled?: boolean;
  persistOnReload?: boolean;
}

interface TimerMessage {
  type: string;
  running?: boolean;
  remainingTime?: number;
}

const STORAGE_KEY = "focusbutton_timer_state";

const getBrowserAPI = (): BrowserAPIType | null => {
  if (typeof window === "undefined") return null;

  // Check for Chrome API first
  if (typeof chrome !== "undefined" && chrome.runtime) {
    return chrome as unknown as BrowserAPIType;
  }

  // Fallback to Firefox API
  if (typeof browser !== "undefined" && (browser as any).runtime?.id) {
    return browser as unknown as BrowserAPIType;
  }

  return null;
};

const getStorageData = async () => {
  const browserAPI = getBrowserAPI();
  if (!browserAPI) return null;

  try {
    const result = await browserAPI.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY];
  } catch (error) {
    console.error("Error getting storage data:", error);
    return null;
  }
};

const formatMinutes = (timeInSeconds: number): string => {
  if (!timeInSeconds && timeInSeconds !== 0) return "00";

  const minutes = Math.floor(timeInSeconds / 60);
  return minutes.toString().padStart(2, "0");
};

const formatSeconds = (timeInSeconds: number): string => {
  if (!timeInSeconds && timeInSeconds !== 0) return "00";

  const seconds = timeInSeconds % 60;
  return seconds.toString().padStart(2, "0");
};

export default function FocusButton() {
  const [isExtension, setIsExtension] = useState(false);
  const [time, setTime] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<any | null>(null);
  const isTimerEndingRef = useRef<Boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastBackgroundStateRef = useRef<any>(null);
  const adjustIntervalRef = useRef<number | null>(null);
  const adjustStartTimeRef = useRef<number | null>(null);
  const lastVisibilityUpdateRef = useRef<number>(0);
  const updateThrottleMs = 100;
  const { resolvedTheme, setTheme } = useTheme();

  // Add global type declaration for browser
  const [initialMount, setInitialMount] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Add startTimeRef declaration
  const startTimeRef = useRef<number>(0);

  // Check for extension context after mount
  useEffect(() => {
    const checkExtension = () => {
      // Check if we're in a browser extension context
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.id
      ) {
        return true;
      }
      // Fallback check for Firefox and other browsers
      if (typeof browser !== "undefined" && (browser as any).runtime?.id) {
        return true;
      }
      return false;
    };

    setIsExtension(checkExtension());
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
        const browserAPI = getBrowserAPI();
        if (!browserAPI) {
          throw new Error("Browser API not available");
        }

        return browserAPI.runtime
          .sendMessage(msg)
          .then((response: any) => {
            console.log("Message response:", response);
            return response;
          })
          .catch((error: any) => {
            console.error("Message sending error:", error);
            return null;
          });
      } catch (error) {
        console.error("Error in sendMessage:", error);
        return null;
      }
    },
    [isExtension],
  );

  const handleTimerEnd = useCallback(() => {
    console.log("Timer reached zero");
    setIsCountingDown(false);
    setIsPaused(false);
    setTime(0);
    setDisplayTime(0);
    setIsFinished(true);

    // Clear timer state immediately
    if (!isExtension) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      const browserAPI = getBrowserAPI();
      if (browserAPI?.storage?.local) {
        browserAPI.storage.local.set({
          [STORAGE_KEY]: {
            type: "TIMER_UPDATE",
            isCountingDown: false,
            time: 0,
            isPaused: false,
            isFinished: true,
            source: "ui",
            timestamp: Date.now(),
          },
        });
      }
    }

    // Clear interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Play sound and show notification
    if (isExtension) {
      sendMessage({ type: "PLAY_SOUND" });
      sendMessage({ type: "SHOW_NOTIFICATION", title: "Time's up!" });
    } else {
      playNotificationSound();
      sendNotification();
    }
  }, [isExtension, sendMessage]);

  const startCountdown = useCallback(
    (duration?: number) => {
      console.log("Starting countdown with duration:", duration ?? time);

      if (duration !== undefined) {
        setTime(duration);
        setDisplayTime(duration);
      }

      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsCountingDown(true);
      setIsPaused(false);
      setIsFinished(false);

      const now = Date.now();
      startTimeRef.current = now;

      if (isExtension) {
        console.log("Starting extension timer");
        const browserAPI = getBrowserAPI();
        if (browserAPI) {
          // Update extension state
          browserAPI.storage.local.set({
            [STORAGE_KEY]: {
              type: "TIMER_UPDATE",
              isCountingDown: true,
              time: duration ?? time,
              isPaused: false,
              isFinished: false,
              source: "ui",
              timestamp: now,
              startTime: now,
            },
          });

          // Send message to background
          sendMessage({
            type: "START_TIMER",
            time: duration ?? time,
          });
        }
      } else {
        console.log("Starting web timer");
        // Start local timer for web mode
        timerRef.current = setInterval(() => {
          setDisplayTime((prevTime) => {
            const newTime = Math.max(0, prevTime - 1);
            console.log("Timer update:", newTime);
            if (newTime === 0) {
              console.log("Timer reached zero");
              clearInterval(timerRef.current);
              timerRef.current = null;
              handleTimerEnd();
            }
            return newTime;
          });
        }, 1000);

        // Save state to localStorage
        const state: TimerState = {
          time: duration ?? time,
          isCountingDown: true,
          isPaused: false,
          startTime: now,
          isFinished: false,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }

      trackEvent("timer_start", { duration: duration || time });
    },
    [time, isExtension, sendMessage, handleTimerEnd],
  );

  const handleCancel = useCallback(() => {
    // Prevent multiple cancellations
    if (isTimerEndingRef.current) {
      return;
    }
    isTimerEndingRef.current = true;

    // Clear any existing timer interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isExtension) {
      const browserAPI = getBrowserAPI();
      if (browserAPI) {
        sendMessage({ type: "STOP_TIMER", isCanceled: true });
        browserAPI.storage.local.set({
          [STORAGE_KEY]: {
            type: "TIMER_UPDATE",
            time: 0,
            isPaused: false,
            isFinished: true,
            source: "web",
            timestamp: Date.now(),
            isFinalState: true,
            isCanceled: true,
          },
        });
      }
    }

    setTime(0);
    setDisplayTime(0);
    setIsCountingDown(false);
    setIsPaused(false);
    setIsFinished(true);

    if (!isExtension) {
      localStorage.removeItem(STORAGE_KEY);
    }

    trackEvent("timer_cancel");

    // Reset the flag after a short delay
    setTimeout(() => {
      isTimerEndingRef.current = false;
    }, 1000);
  }, [isExtension, sendMessage]);

  const handleClick = () => {
    // Don't handle clicks during adjustment
    if (adjustIntervalRef.current) {
      return;
    }

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

    setIsPaused(true);
    setIsCountingDown(false);

    // Clear interval if running locally
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isExtension) {
      sendMessage({ type: "PAUSE_TIMER" });

      // Update storage state
      const state = {
        type: "TIMER_UPDATE",
        isCountingDown: false,
        time: displayTime,
        isPaused: true,
        source: "ui",
        timestamp: Date.now(),
        startTime: startTimeRef.current,
        persistOnReload: true,
      };

      getBrowserAPI()?.storage.local.set({
        focusbutton_timer_state: state,
      });
    } else {
      // Update local storage for web version
      const state = {
        type: "TIMER_UPDATE",
        isCountingDown: false,
        time: displayTime,
        isPaused: true,
        source: "ui",
        timestamp: Date.now(),
        startTime: startTimeRef.current,
        persistOnReload: true,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    trackEvent("timer_pause", { timeLeft: time });
  };

  const handleResume = () => {
    console.log("Resuming timer");

    setIsPaused(false);
    setIsCountingDown(true);

    const now = Date.now();
    startTimeRef.current = now;

    if (isExtension) {
      sendMessage({ type: "RESUME_TIMER" });

      // Ensure storage is updated
      getBrowserAPI()?.storage.local.set({
        focusbutton_timer_state: {
          type: "TIMER_UPDATE",
          isCountingDown: true,
          time: displayTime,
          isPaused: false,
          source: "ui",
          timestamp: now,
          startTime: startTimeRef.current,
        },
      });
    } else {
      // Start the timer with current remaining time
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Start countdown with current display time
      startCountdown(displayTime);
    }

    trackEvent("timer_resume", { timeLeft: displayTime });
  };

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
    // After initial animation, set initialMount to false
    const timer = setTimeout(() => {
      setInitialMount(false);
    }, 300); // slightly longer than animation duration
    return () => clearTimeout(timer);
  }, []);

  // Restore timer state on mount
  useEffect(() => {
    const restoreTimerState = async () => {
      try {
        let state;

        if (isExtension) {
          const result = await chrome.storage.local.get([
            "focusbutton_timer_state",
          ]);
          state = result.focusbutton_timer_state;
        } else {
          const savedState = localStorage.getItem(STORAGE_KEY);
          if (savedState) {
            state = JSON.parse(savedState);
          }
        }

        if (state && state.persistOnReload) {
          setTime(state.time);
          setDisplayTime(state.time);
          setIsCountingDown(state.isCountingDown);
          setIsPaused(state.isPaused);
          if (state.startTime) {
            startTimeRef.current = state.startTime;
          }
        }
      } catch (error) {
        console.error("Error restoring timer state:", error);
      }
    };

    restoreTimerState();
  }, [isExtension]);

  // Listen for timer state changes
  useEffect(() => {
    if (!isExtension) return;

    const handleStorageChange = (changes: any) => {
      const timerState = changes[STORAGE_KEY]?.newValue;
      if (!timerState || timerState.source === "ui") return;

      console.log("Storage state changed:", timerState);

      // Update UI state from background worker
      setTime(timerState.time);
      setDisplayTime(timerState.time);
      setIsCountingDown(timerState.isCountingDown);
      setIsPaused(timerState.isPaused);

      // Handle finished state
      if (timerState.isFinished) {
        console.log("Timer finished, setting finished state");
        setIsFinished(true);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [isExtension]);

  // Track last state update
  const STATE_UPDATE_THROTTLE = 100;

  // Track state updates from background

  // Listen for state changes
  useEffect(() => {
    if (!isExtension) return;

    const browserAPI = getBrowserAPI();
    if (!browserAPI) return;

    const handleStorageChange = async (changes: any) => {
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

    browserAPI.storage.onChanged.addListener(handleStorageChange);
    return () =>
      browserAPI.storage.onChanged.removeListener(handleStorageChange);
  }, [isExtension]);

  // Remove timer message handler since we're using storage
  useEffect(() => {
    if (isExtension) {
      const handleMessage = (message: any) => {
        if (message.type === "PLAY_SOUND") {
          // Skip playing sound in extension mode, handled by offscreen document
          return;
        }
      };

      getBrowserAPI()?.runtime.onMessage.addListener(handleMessage);
      return () => {
        getBrowserAPI()?.runtime.onMessage.removeListener(handleMessage);
      };
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

  const isNotificationSupported = typeof Notification !== "undefined";

  const requestNotificationPermission = useCallback(async () => {
    if (!isNotificationSupported) return;

    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch (error) {
        console.log("Error requesting notification permission:", error);
      }
    }
  }, []);

  const sendNotification = useCallback(() => {
    if (isExtension) {
      const browserAPI = getBrowserAPI();
      if (browserAPI) {
        browserAPI.notifications.create("timer_end", {
          type: "basic",
          iconUrl: "/icons/icon-128.png",
          title: "Time's up!",
          message: "Your focus session has ended.",
        });
      }
    } else if (isNotificationSupported) {
      if (Notification.permission === "granted") {
        new Notification("Time's up!", {
          body: "Your focus session has ended.",
          icon: "/icons/icon-128.png",
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification("Time's up!", {
              body: "Your focus session has ended.",
              icon: "/icons/icon-128.png",
            });
          }
        });
      }
    }
  }, [isExtension]);

  const MAX_TIME = 3600; // 60 minutes in seconds

  const startAdjustment = (direction: number, isMinutes: boolean = false) => {
    // Stop countdown if running
    if (isCountingDown) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsCountingDown(false);
      setIsPaused(false);
      setIsFinished(false);

      // Clear extension timer state if in extension
      if (isExtension) {
        const browserAPI = getBrowserAPI();
        if (browserAPI) {
          browserAPI.storage.local.remove(STORAGE_KEY);
          sendMessage({ type: "STOP_TIMER", isCanceled: true });
        }
      }
    }

    // Set to paused state when adjusting time
    setIsPaused(true);

    const increment = isMinutes ? 60 : 1; // 60 seconds for minutes, 1 for seconds
    const adjustTime = () => {
      setDisplayTime((prevTime) => {
        const newTime = prevTime + direction * increment;
        // Ensure time stays within bounds (0 to 60 minutes)
        const boundedTime = Math.max(0, Math.min(3600, newTime));
        setTime(boundedTime); // Update the actual time state

        // Update extension storage if in extension context
        if (isExtension) {
          const browserAPI = getBrowserAPI();
          if (browserAPI) {
            browserAPI.storage.local.set({
              [STORAGE_KEY]: {
                type: "TIMER_UPDATE",
                isCountingDown: false,
                time: boundedTime,
                isPaused: true,
                isFinished: false,
                source: "ui",
                timestamp: Date.now(),
                startTime: Date.now(),
              },
            });
          }
        }

        return boundedTime;
      });
    };

    adjustTime(); // Initial adjustment

    if (!adjustIntervalRef.current) {
      // 500ms for minutes, 200ms for seconds
      const intervalTime = isMinutes ? 500 : 200;
      adjustIntervalRef.current = window.setInterval(adjustTime, intervalTime);
    }
  };

  const stopAdjustment = () => {
    if (adjustIntervalRef.current) {
      clearInterval(adjustIntervalRef.current);
      adjustIntervalRef.current = null;
    }

    // Update storage with final time but keep paused state
    if (isExtension) {
      const browserAPI = getBrowserAPI();
      if (browserAPI) {
        browserAPI.storage.local.set({
          [STORAGE_KEY]: {
            type: "TIMER_UPDATE",
            isCountingDown: false,
            time: time,
            isPaused: true,
            isFinished: false,
            source: "ui",
            timestamp: Date.now(),
            startTime: Date.now(),
          },
        });
      }
    }

    setDisplayTime(time);
  };

  const handleVisibilityChange = useCallback(
    (now: number) => {
      if (document.hidden) {
        return;
      }

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
    },
    [time, isCountingDown, startCountdown, handleTimerEnd],
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
      handleVisibilityChangeWrapper,
    );
    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChangeWrapper,
      );
    };
  }, [handleVisibilityChange]);

  const upButtonRef = useRef<HTMLButtonElement>(null);
  const downButtonRef = useRef<HTMLButtonElement>(null);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keys if input is focused
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          upButtonRef.current?.focus();
          {
            const newTime = Math.min(time + 1, MAX_TIME);
            setTime(newTime);
            setDisplayTime(newTime);
            startCountdown(newTime);
            if (isExtension) {
              const browserAPI = getBrowserAPI();
              if (browserAPI) {
                browserAPI.storage.local.set({
                  [STORAGE_KEY]: {
                    type: "TIMER_UPDATE",
                    isCountingDown: false,
                    time: newTime,
                    isPaused: false,
                    source: "web",
                    timestamp: Date.now(),
                  },
                });
              }
            }
          }
          break;

        case "ArrowDown":
          event.preventDefault();
          downButtonRef.current?.focus();
          {
            const newTime = Math.max(time - 1, 0);
            setTime(newTime);
            startCountdown(newTime);
            setDisplayTime(newTime);
            if (isExtension) {
              const browserAPI = getBrowserAPI();
              if (browserAPI) {
                browserAPI.storage.local.set({
                  [STORAGE_KEY]: {
                    type: "TIMER_UPDATE",
                    isCountingDown: false,
                    time: newTime,
                    isPaused: false,
                    source: "web",
                    timestamp: Date.now(),
                  },
                });
              }
            }
          }
          break;

        case " ":
        case "Enter":
          event.preventDefault();
          if (time > 0) {
            if (!isCountingDown || isPaused) {
              const currentTime = time;
              startCountdown(currentTime);
            } else {
              handlePause();
            }
          }
          break;

        case "Escape":
          if (isCountingDown) {
            handleCancel();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    time,
    isCountingDown,
    isPaused,
    isExtension,
    startCountdown,
    handlePause,
    handleCancel,
  ]);

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
        "meta[name='theme-color']",
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
        "meta[name='background-color']",
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

      getBrowserAPI()?.runtime.onMessage.addListener(handleMessage);
      return () => {
        getBrowserAPI()?.runtime.onMessage.removeListener(handleMessage);
      };
    }
  }, []);

  const updateTimerState = useCallback((message: TimerMessage) => {
    if (!message.remainingTime) return;

    setTime(message.remainingTime);
    setDisplayTime(message.remainingTime);

    if (message.running !== undefined) {
      setIsCountingDown(message.running);
      setIsPaused(!message.running);
    }
  }, []);

  useEffect(() => {
    if (isExtension) {
      const handleMessage = (message: any) => {
        console.log("Received message:", message);

        if (message.type === "TIMER_UPDATE") {
          console.log("Timer update message:", {
            remainingTime: message.remainingTime,
            running: message.running,
            isPaused: message.isPaused,
          });

          if (message.remainingTime !== undefined) {
            console.log("Updating time to:", message.remainingTime);
            setTime(message.remainingTime);
            setDisplayTime(message.remainingTime);

            // Start or update local timer for smooth UI updates
            if (message.running && !message.isPaused) {
              console.log("Starting local countdown timer");
              if (timerRef.current) {
                console.log("Clearing existing timer");
                clearInterval(timerRef.current);
              }
              timerRef.current = setInterval(() => {
                setDisplayTime((prevTime) => {
                  const newTime = Math.max(0, prevTime - 1);
                  console.log("Local timer update:", newTime);
                  if (newTime === 0) {
                    console.log("Timer reached zero, clearing interval");
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    handleTimerEnd();
                  }
                  return newTime;
                });
              }, 1000);
            } else if (timerRef.current) {
              console.log("Stopping local countdown timer");
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }

          if (message.running !== undefined) {
            console.log("Updating timer state:", {
              running: message.running,
              paused: !message.running,
            });
            setIsCountingDown(message.running);
            setIsPaused(!message.running);
          }
        }
        return true; // Required for Chrome extension message handling
      };

      console.log("Setting up message listener");
      chrome.runtime.onMessage.addListener(handleMessage);
      return () => {
        console.log("Cleaning up message listener");
        chrome.runtime.onMessage.removeListener(handleMessage);
        if (timerRef.current) {
          console.log("Cleaning up timer");
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [isExtension, handleTimerEnd]);

  useEffect(() => {
    if (isExtension) {
      const browserAPI = getBrowserAPI();
      if (!browserAPI) return;

      browserAPI.runtime
        .sendMessage({ type: "GET_TIMER_STATE" })
        .then((response: TimerMessage) => {
          if (response?.running) {
            setTime(response.remainingTime || 0);
            setDisplayTime(response.remainingTime || 0);
            setIsCountingDown(true);
            setIsPaused(false);
          }
        });
    }
  }, [isExtension]);

  // Don't render anything until mounted
  if (!isMounted) {
    return;
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div
          className={clsx(styles.focusButton, {
            [styles.mounted]: initialMount && isMounted,
            [styles.counting]: isCountingDown && !isPaused,
            [styles.paused]: isPaused,
            [styles.finished]: isFinished,
          })}
        >
          <div className={styles.themeToggle}>
            {resolvedTheme === "dark" ? (
              <Sun
                className={styles.sun}
                size={20}
                onClick={() => {
                  setTheme("light");
                }}
              />
            ) : (
              <Moon
                className={styles.moon}
                size={20}
                onClick={() => {
                  setTheme("dark");
                }}
              />
            )}
          </div>
          <div className={styles.timeDisplay}>
            <div
              className={styles.time}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className={styles.minutes}>
                <button
                  ref={upButtonRef}
                  className={styles.timeAdjust}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (e.buttons === 1) {
                      startAdjustment(1, true);
                    }
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    stopAdjustment();
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    if (adjustIntervalRef.current) {
                      stopAdjustment();
                    }
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    startAdjustment(1, true);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    stopAdjustment();
                  }}
                >
                  <ChevronUp size={16} />
                </button>

                <NumberFlow
                  format={{ minimumIntegerDigits: 2 }}
                  value={Math.floor(displayTime / 60)}
                />

                <button
                  ref={downButtonRef}
                  className={styles.timeAdjust}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (e.buttons === 1) {
                      startAdjustment(-1, true);
                    }
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    stopAdjustment();
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    if (adjustIntervalRef.current) {
                      stopAdjustment();
                    }
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    startAdjustment(-1, true);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    stopAdjustment();
                  }}
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              :
              <div className={styles.seconds}>
                <button
                  ref={upButtonRef}
                  className={styles.timeAdjust}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (e.buttons === 1) {
                      startAdjustment(1, false);
                    }
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    stopAdjustment();
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    if (adjustIntervalRef.current) {
                      stopAdjustment();
                    }
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    startAdjustment(1, false);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    stopAdjustment();
                  }}
                >
                  <ChevronUp size={16} />
                </button>

                <NumberFlow
                  format={{ minimumIntegerDigits: 2 }}
                  value={displayTime % 60}
                />

                <button
                  ref={downButtonRef}
                  className={styles.timeAdjust}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (e.buttons === 1) {
                      startAdjustment(-1, false);
                    }
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    stopAdjustment();
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    if (adjustIntervalRef.current) {
                      stopAdjustment();
                    }
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    startAdjustment(-1, false);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    stopAdjustment();
                  }}
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          className={`${styles.controls} ${
            isCountingDown || time > 0 ? styles.visible : ""
          }`}
        >
          <button onClick={handleClick}>
            {isPaused ? (
              <>
                <CirclePlay width={14} height={14} />
                Start
              </>
            ) : (
              <>
                <CirclePause width={14} height={14} />
                Pause
              </>
            )}
          </button>
          <button onClick={handleCancel}>
            <CircleX width={14} height={14} />
            Cancel
          </button>
        </div>
      </main>
    </div>
  );
}
