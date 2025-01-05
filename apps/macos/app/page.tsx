"use client";

import { FocusButton } from "@focusbutton/ui";
import styles from "./page.module.css";

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

export default function Home() {
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
        <div className={styles.content}>
          <div className={styles.focusButton}>
            <FocusButton />
          </div>
          <button onClick={handleExit} className={styles.exitButton}>
            Exit
          </button>
        </div>
      </main>
    </div>
  );
}
