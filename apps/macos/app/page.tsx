"use client";

import { FocusButton } from "@focusbutton/ui";
import styles from "./page.module.css";
import { CircleX } from "lucide-react";

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
        <FocusButton className={styles.focusButton} />
        <button className={styles.exitButton} onClick={handleExit}>
          <CircleX size={20} />
        </button>
      </main>
    </div>
  );
}
