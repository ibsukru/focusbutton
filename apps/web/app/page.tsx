"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.scss";
import { ChevronDown, ChevronUp } from "lucide-react";
import MotionNumber from "motion-number";
import { useTheme } from "next-themes";

const STORAGE_KEY = "focusbutton_timer_state";

interface TimerState {
  time: number;
  isCountingDown: boolean;
  isPaused: boolean;
  startTime: number;
}

export default function Home() {
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
  const adjustIntervalRef = useRef<number | null>(null);
  const adjustStartTimeRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const { resolvedTheme, setTheme } = useTheme();

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

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  };

  const playNotificationSound = async () => {
    try {
      const audio = new Audio("/timer-end.mp3");
      await audio.play();
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  };

  const sendNotification = async () => {
    // Request permission if not granted
    if (notificationPermission !== "granted") {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        console.log("Notification permission not granted");
        playNotificationSound(); // Play sound even if notification permission denied
        return;
      }
    }

    try {
      // Play sound in all cases
      playNotificationSound();

      if ("Notification" in window) {
        let notificationShown = false;

        try {
          const notification = new Notification("Focus Timer Complete!", {
            body: "Your focus session has ended.",
            icon: "/favicon.ico",
            requireInteraction: true,
            tag: "focus-timer",
            silent: true, // We handle sound separately
          });

          notification.addEventListener("show", () => {
            console.log("Notification show event fired");
            notificationShown = true;
          });

          notification.addEventListener("error", (e) => {
            console.error("Notification error:", e);
            notificationShown = false;
          });

          notification.onclick = () => {
            window.focus();
            window.location.href = window.location.href;
            notification.close();
          };

          // Wait a bit to see if the main notification was shown
          setTimeout(() => {
            // Only show fallback if the notification failed
            if (!notificationShown) {
              console.log("Showing fallback notification");
              const fallbackNotification = new Notification(
                "Focus Timer Complete!",
                {
                  body: "Your focus session has ended.",
                  icon: "/favicon.ico",
                  requireInteraction: true,
                  tag: "focus-timer-fallback",
                  silent: true, // We handle sound separately
                }
              );

              fallbackNotification.onclick = () => {
                window.focus();
                window.location.href = window.location.href;
                fallbackNotification.close();
              };
            }
          }, 500);
        } catch (error) {
          console.error("Error creating notification:", error);
        }
      }
    } catch (error) {
      console.error("Error in sendNotification:", error);
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

    const countdownInterval = setInterval(() => {
      setTime((prevTime) => {
        if (prevTime <= 0) {
          clearInterval(countdownInterval);
          setIsCountingDown(false);
          setIsPaused(false);
          setIsFinished(true);
          sendNotification();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    timerRef.current = countdownInterval;
    setIsCountingDown(true);
    setIsPaused(false);
  };

  useEffect(() => {
    if (isFinished) {
      const timer = setTimeout(() => {
        setIsFinished(false);
      }, 500); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isFinished]);

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
  };

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
