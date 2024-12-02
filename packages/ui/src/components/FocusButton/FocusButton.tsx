"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./FocusButton.module.scss";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { BrowserAPIType } from "@focusbutton/extension/src/browser-api";
import { useTheme } from "next-themes";
import clsx from "clsx";

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
  if (typeof browser !== "undefined" && (browser as any).runtime) {
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

const formatTimeValues = (timeInSeconds: number): string => {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = timeInSeconds % 60;

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  if (hours > 0) {
    return `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;
  }
  return `${formatNumber(minutes)}:${formatNumber(seconds)}`;
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
    if (isTimerEndingRef.current) {
      return;
    }
    isTimerEndingRef.current = true;

    if (isExtension) {
      const browserAPI = getBrowserAPI();
      if (browserAPI) {
        browserAPI.notifications.create({
          type: "basic",
          iconUrl: "/icons/icon-128.png",
          title: "Time's up!",
          message: "Time's up! Take a break.",
        });
      }
    } else {
      // Only play notification for web version if timer wasn't canceled
      const state = localStorage.getItem(STORAGE_KEY);
      if (state) {
        const timerState = JSON.parse(state);
        if (!timerState.isCanceled) {
          playNotificationSound();
        }
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

    trackEvent("timer_end");

    // Reset the flag after a short delay
    setTimeout(() => {
      isTimerEndingRef.current = false;
    }, 1000);
  }, [isExtension]);

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
      }

      setIsCountingDown(true);
      setIsPaused(false);
      setIsFinished(false);

      const now = Date.now();
      startTimeRef.current = now;

      // Start local timer for smooth UI updates (same for both modes)
      timerRef.current = setInterval(() => {
        setDisplayTime((prevTime) => {
          const newTime = Math.max(0, prevTime - 1);
          console.log("Timer update:", newTime);
          if (newTime === 0) {
            console.log("Timer reached zero");
            clearInterval(timerRef.current);
            timerRef.current = null;
            handleTimerEnd();
            sendNotification();
          }
          return newTime;
        });
      }, 1000);

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
    setIsCountingDown(true);

    // Then update extension
    if (isExtension) {
      sendMessage({ type: "PAUSE_TIMER" });
      const browserAPI = getBrowserAPI();
      // Ensure storage is updated
      browserAPI?.storage?.local?.set?.({
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
        isFinished: false,
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

  // Update state restoration for cross-browser compatibility
  useEffect(() => {
    if (!isMounted || stateRestoredRef.current) return;

    const restoreState = async () => {
      try {
        let savedState: TimerState | null = null;

        if (isExtension) {
          savedState = await getStorageData();
        } else {
          const stateStr = localStorage.getItem(STORAGE_KEY);
          if (stateStr) {
            savedState = JSON.parse(stateStr);
          }
        }

        if (savedState && !savedState.isFinalState) {
          setTime(savedState.time);
          setIsCountingDown(savedState.isCountingDown);
          setIsPaused(savedState.isPaused);

          if (savedState.isCountingDown && !savedState.isPaused) {
            console.log("App coming to foreground, restoring timer state");
            const elapsed = Math.floor(
              (Date.now() - savedState.startTime) / 1000,
            );
            const remaining = Math.max(0, savedState.time - elapsed);

            if (remaining > 0) {
              startCountdown(remaining);
            } else {
              handleTimerEnd();
            }
          } else {
            setDisplayTime(savedState.time);
          }
        }

        stateRestoredRef.current = true;
      } catch (error) {
        console.error("Error restoring timer state:", error);
      }
    };

    restoreState();
  }, [isMounted, isExtension, getStorageData, startCountdown, handleTimerEnd]);

  // Update storage listener for cross-browser compatibility
  useEffect(() => {
    if (!isExtension) return;

    const browserAPI = getBrowserAPI();
    if (!browserAPI) return;

    const handleStorageChange = (changes: any) => {
      const timerChange = changes[STORAGE_KEY];
      if (timerChange && timerChange.newValue) {
        const newState = timerChange.newValue;

        if (
          newState.source === "extension" &&
          newState.timestamp > lastStateUpdateRef.current
        ) {
          setTime(newState.time);
          setIsCountingDown(newState.isCountingDown);
          setIsPaused(newState.isPaused);

          if (newState.isCountingDown && !newState.isPaused) {
            const elapsed = Math.floor(
              (Date.now() - newState.startTime) / 1000,
            );
            const remaining = Math.max(0, newState.time - elapsed);

            if (remaining > 0) {
              startCountdown(remaining);
            } else {
              handleTimerEnd();
            }
          } else {
            setDisplayTime(newState.time);
          }
        }
      }
    };

    browserAPI.storage.onChanged.addListener(handleStorageChange);
    return () => {
      browserAPI.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [isExtension, getBrowserAPI, startCountdown, handleTimerEnd]);

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
      return () =>
        getBrowserAPI()?.runtime.onMessage.removeListener(handleMessage);
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
    if (
      adjustment > 0 &&
      isNotificationSupported &&
      Notification.permission === "default"
    ) {
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
        setIsCountingDown(false);
        setIsPaused(false);
        setIsFinished(true);

        // For extension mode, explicitly stop the timer
        if (isExtension) {
          sendMessage({ type: "STOP_TIMER" });
          getBrowserAPI()?.storage.local.set({
            focusbutton_timer_state: {
              type: "TIMER_UPDATE",
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
        const browserAPI = getBrowserAPI();
        if (browserAPI) {
          browserAPI.storage.local.set({
            [STORAGE_KEY]: {
              type: "TIMER_UPDATE",
              isCountingDown: false,
              time: newTime,
              isPaused: false,
              isFinished: false,
            },
          });
        }
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

    // Only start countdown if not already counting down and time > 0
    if (time > 0 && !isCountingDown && !isPaused) {
      startCountdown();
    }
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

  // Handle keyboard events with proper types
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isCountingDown || time === 0) return;

      switch (event.key) {
        case "Escape":
          handleCancel();
          break;
        case " ":
          event.preventDefault();
          if (isPaused) {
            startCountdown(time);
          } else {
            const browserAPI = getBrowserAPI();
            if (isExtension && browserAPI) {
              browserAPI.storage.local.set({
                [STORAGE_KEY]: {
                  type: "TIMER_UPDATE",
                  isCountingDown: true,
                  time: time,
                  isPaused: true,
                  source: "web",
                  timestamp: Date.now(),
                },
              });
            }
            setIsPaused(true);
          }
          break;
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
  }, [isCountingDown, time, startCountdown, handleCancel, isExtension]);

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
          <div className={styles.timeDisplay}>
            <button
              className={styles.timeAdjust}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (e.buttons === 1) {
                  // Only adjust if left mouse button is pressed
                  startAdjustment(-1);
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
                if (e.buttons === 1) {
                  // Only adjust if left mouse button is pressed
                  startAdjustment(1);
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
            isCountingDown || time > 0 ? styles.visible : ""
          }`}
        >
          <button onClick={handleClick}>{isPaused ? "Resume" : "Pause"}</button>
          <button onClick={handleCancel}>Cancel</button>
        </div>
      </main>
    </div>
  );
}
