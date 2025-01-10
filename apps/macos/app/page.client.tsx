"use client";

import { FocusButton } from "@focusbutton/ui";
import { XCircle } from "lucide-react";

import styles from "./page.module.css";
import { useEffect, useState } from "react";

// Declare the webkit type for the window object
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        focusApp?: {
          postMessage: (message: any) => void;
        };
      };
    };
  }
}

// Function to update timer in menu bar
const updateMenuBarTimer = (time: number) => {
  if (window.webkit?.messageHandlers?.focusApp) {
    window.webkit.messageHandlers.focusApp.postMessage({
      type: "updateTimer",
      time,
    });
  }
};

// Function to clear timer in menu bar
const clearMenuBarTimer = () => {
  if (window.webkit?.messageHandlers?.focusApp) {
    window.webkit.messageHandlers.focusApp.postMessage({
      type: "clearTimer",
    });
  }
};

export default function HomeClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleExit = () => {
    // Send message to Swift to quit the app
    if (window.webkit?.messageHandlers?.focusApp) {
      window.webkit.messageHandlers.focusApp.postMessage({
        type: "quit",
      });
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <FocusButton
          onTimer={updateMenuBarTimer}
          onTimerEnd={clearMenuBarTimer}
          onTimerCancel={clearMenuBarTimer}
          // onTimerPause={clearMenuBarTimer}
        />
        <button className={styles.exitButton} onClick={handleExit}>
          <XCircle size={20} />
        </button>
      </main>
    </div>
  );
}
