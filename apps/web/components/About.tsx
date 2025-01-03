import React from "react";
import clsx from "clsx";

import styles from "./About.module.scss";

export default function About({ className }: { className?: string }) {
  return (
    <div className={clsx(styles.about, className)}>
      <h1>✨ FocusButton</h1>
      <div className={styles.aboutContent}>
        <p>
          🎯 Focus Button is your ultimate productivity companion, available
          both as a web tool and browser extension. In today&apos;s digital
          world, staying focused can be challenging with countless distracting
          websites just a click away. That&apos;s where Focus Button comes in -
          offering a simple solution to help you stay focused on your tasks.
        </p>

        <p>
          🚀 Whether you choose to use our instant web version or install our
          browser extension, Focus Button helps you maintain focus during work
          or study sessions. With a simple click, you can set a timer to stay
          committed to your task, helping you achieve your goals without
          distractions. The web version requires no installation - just visit
          and click to start your focus session.
        </p>

        <div className={styles.features}>
          <h3>🌟 Key Features:</h3>
          <ul>
            <li>⚡️ Instant web access - start focusing with just one click</li>
            <li>🔌 Available as web app and browser extensions</li>
            <li>💫 Simple, distraction-free interface</li>
            <li>
              🔄 Seamless synchronization between devices (with extension)
            </li>
            <li>🔒 Privacy-first approach - no data collection</li>
            <li>⚙️ Works instantly - no setup needed</li>
            <li>📈 Continuous improvements based on user feedback</li>
          </ul>
        </div>

        <div className={styles.versions}>
          <h3>📦 Available Versions:</h3>
          <div className={styles.versionsList}>
            <div className={styles.version}>
              <h4>🌐 Web Version</h4>
              <p>
                Start focusing instantly through your browser - perfect for when
                you need to concentrate on important tasks. No installation
                required, just visit and click to begin your focus session.
              </p>
            </div>
            <div className={styles.version}>
              <h4>🧩 Browser Extensions</h4>
              <p>
                Get the same great focus-enhancing features with our browser
                extensions. Install once and have Focus Button always ready
                whenever you need to concentrate on your work.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
