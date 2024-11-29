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
  const [currentTimerId, setCurrentTimerId] = useState<string | null>(null);
  const timerRef = useRef<any | null>(null);
  const endRef = useRef<Boolean>(false);
  const isTimerEndingRef = useRef<Boolean>(false);
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

  // Track events with GA4
  const trackEvent = (eventName: string, params = {}) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", eventName, {
        ...params,
        source: "FocusButton",
      });
    }
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
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (error) {
      console.log("Web Audio API not supported");
    }

    // On iOS, we need to play (and immediately pause) after user interaction
    const initAudio = () => {
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            audioRef.current?.pause();
            audioRef.current?.load();
          })
          .catch((error) => {
            console.log("Initial audio play failed (expected):", error);
          });
      }

      // Also resume audio context if available
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
    };

    // Add listeners for user interaction
    const interactionEvents = ["touchstart", "click"];
    interactionEvents.forEach((event) => {
      document.addEventListener(event, initAudio, { once: true });
    });

    return () => {
      interactionEvents.forEach((event) => {
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

  useEffect(() => {
    // Cleanup function
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  // useEffect(() => {
  //   // Listen for timer complete message from background script
  //   if (typeof chrome !== "undefined" && chrome.runtime) {
  //     const handleMessage = (message: any) => {
  //       if (
  //         message.type === "TIMER_COMPLETE" &&
  //         message.timerId === currentTimerId
  //       ) {
  //         handleTimerEnd();
  //       }
  //     };

  //     chrome.runtime.onMessage.addListener(handleMessage);
  //     return () => chrome.runtime.onMessage.removeListener(handleMessage);
  //   }
  // }, [currentTimerId]);

  const handleTimerEnd = useCallback(() => {
    if (isTimerEndingRef.current) return;
    isTimerEndingRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsPaused(false);
    setIsFinished(true);
    setCurrentTimerId(null);
    trackEvent("timer_complete", { duration: time });
    sendNotification().catch((error) => {
      console.error("Failed to send notification:", error);
    });
  }, [time, currentTimerId]);

  const startCountdown = () => {
    // Reset refs
    endRef.current = false;
    isTimerEndingRef.current = false;

    // Clear any existing interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsCountingDown(true);
    setIsPaused(false);

    if (typeof chrome !== "undefined" && chrome.runtime) {
      // Extension mode - only update display
      chrome.runtime.sendMessage(
        {
          type: "START_TIMER",
          duration: time,
        },
        (response) => {
          if (response?.success && response.timerId) {
            setCurrentTimerId(response.timerId);
          }
        }
      );

      // Just update the display, actual timing is handled by background script
      timerRef.current = window.setInterval(() => {
        setTime((prevTime) => Math.max(0, prevTime - 1));
      }, 1000);
    } else {
      // For non-extension mode, use browser timer
      timerRef.current = window.setInterval(() => {
        setTime((prevTime) => {
          if (prevTime <= 1 && !endRef.current) {
            endRef.current = true;
            handleTimerEnd();
            return 0;
          }
          return Math.max(0, prevTime - 1);
        });
      }, 1000);
    }
  };

  const playNotificationSound = async () => {
    try {
      const audio = new Audio("/timer-end.mp3");
      audio.volume = 0.5;
      // Preload the audio
      await audio.load();
      // Play and handle promise
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

    // Check if we need permission
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("Notification permission denied");
        return;
      }
    }

    try {
      // For Chrome extension
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.notifications
      ) {
        // Clear any existing notifications
        chrome.notifications.getAll(async (notifications) => {
          await Promise.all(
            Object.keys(notifications || {}).map((id) =>
              chrome.notifications.clear(id)
            )
          );
          chrome.notifications.create("focus-timer-notification", {
            type: "basic",
            iconUrl: "/icons/icon-128.png",
            title: "Time's up!",
            message:
              "Your focus time is complete. Click to return to FocusButton.",
            requireInteraction: true,
            silent: true,
          });
        });

        // Create new Chrome extension notification
      } else {
        // For other browsers, use the Web Notifications API
        const notification = new Notification("Time's up!", {
          body: "Your focus time is complete. Click to return to FocusButton.",
          icon: "/icons/icon-128.png",
          silent: true,
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
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

  const handlePause = () => {
    console.log("Pausing timer");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPaused(true);
    trackEvent("timer_pause", { timeLeft: time });
  };

  const handleResume = () => {
    console.log("Resuming timer");
    startCountdown();
    trackEvent("timer_resume", { timeLeft: time });
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
    setIsFinished(false);

    // Send message to background script to stop timer
    if (typeof chrome !== "undefined" && chrome.runtime && currentTimerId) {
      chrome.runtime.sendMessage({
        type: "STOP_TIMER",
        timerId: currentTimerId,
      });
      setCurrentTimerId(null);
    }

    trackEvent("timer_cancel", { timeLeft: time });
  };

  // Handle visibility change and background time tracking
  const handleVisibilityChange = useCallback(
    (now: number) => {
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
              shouldNotify: true, // Add flag for notification
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
              shouldNotify,
            } = JSON.parse(savedTimer);

            if (wasCountingDown && !wasPaused) {
              const elapsedSeconds = Math.floor((now - startTime) / 1000);
              const newTime = Math.max(0, timeLeft - elapsedSeconds);
              setTime(newTime);
              setDisplayTime(newTime);

              if (newTime === 0 && shouldNotify) {
                // Timer completed while in background
                setIsFinished(true);
                setIsCountingDown(false);
                sendNotification().catch((error) => {
                  console.error("Failed to send notification:", error);
                });
              } else if (newTime > 0) {
                // Resume countdown if time remaining
                startCountdown();
              }
            }
          } catch (error) {
            console.error("Error parsing saved timer:", error);
          }
          localStorage.removeItem("focusTimer");
        }
      }
    },
    [time, isCountingDown, isPaused, startCountdown]
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

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      const handleMessage = (message: any) => {
        if (message.type === "PLAY_SOUND") {
          // Play the notification sound
          const audio = new Audio("/timer-end.mp3");
          audio.volume = 1.0;
          audio.play().catch(console.error);

          // If this is an auto-close tab, close after sound
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get("autoclose") === "true") {
            setTimeout(() => {
              window.close();
            }, 2000);
          }
        }
      };

      chrome.runtime.onMessage.addListener(handleMessage);
      return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }
  }, []);

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.runtime) {
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
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ type: "GET_TIMER_STATE" }, (response) => {
        if (response.running) {
          setTime(response.remainingTime);
          setDisplayTime(response.remainingTime);
          setIsCountingDown(true);
          startCountdown();
        }
      });
    }
  }, []);

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
