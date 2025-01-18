import React from "react"
import clsx from "clsx"

import styles from "./About.module.scss"

export default function About({ className }: { className?: string }) {
  return (
    <div className={clsx(styles.about, className)}>
      <h1>✨ FocusButton</h1>
      <div className={styles.aboutContent}>
        <p>
          🎯 FocusButton is your ultimate productivity companion, available as a
          web tool, browser extension, and native macOS app. In today&apos;s
          digital world, staying focused can be challenging with countless
          distracting websites just a click away. That&apos;s where FocusButton
          comes in - offering a simple solution to help you stay focused on your
          tasks.
        </p>

        <p>
          🚀 Whether you choose to use our instant web version, install our
          browser extension, or use our native macOS app, FocusButton helps you
          maintain focus during work or study sessions. With a simple click, you
          can set a timer to stay committed to your task, helping you achieve
          your goals without distractions. The web version requires no
          installation - just visit and click to start your focus session.
        </p>

        <div className={styles.features}>
          <h3>🌟 Key Features:</h3>
          <ul>
            <li>⚡️ Instant web access - start focusing with just one click</li>
            <li>🔌 Available as web app, browser extensions, and macOS app</li>
            <li>📋 Task management with time tracking</li>
            <li>📊 Visual reports of your focus sessions</li>
            <li>🎯 Pomodoro timer with customizable durations</li>
            <li>💫 Simple, distraction-free interface</li>
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
                you need to concentrate on important tasks. Track your tasks,
                monitor progress, and visualize your productivity with our
                built-in reports. No installation required, just visit and click
                to begin your focus session.
              </p>
            </div>
            <div className={styles.version}>
              <h4>🧩 Browser Extensions</h4>
              <p>
                Get the same great focus-enhancing features with our browser
                extensions. Install once and have FocusButton always ready
                whenever you need to concentrate on your work.{" "}
                <a
                  className={styles.webStore}
                  href="https://chromewebstore.google.com/detail/focusbutton/nkomoiomfaeodakglkihapminhpgnibl?authuser=0&hl=en&pli=1"
                >
                  Download for Chrome
                </a>
                ,{" "}
                <a
                  className={styles.webStore}
                  href="https://addons.mozilla.org/en-US/firefox/addon/focusbutton"
                >
                  Download for Firefox
                </a>
              </p>
            </div>
            {/* <div className={styles.version}>
              <h4>🖥 macOS App</h4>
              <p>
                Experience FocusButton as a native macOS application with menu
                bar integration and seamless desktop experience. Perfect for
                users who want quick access to focus tools right from their
                desktop.{" "}
                <a href="/FocusButton-1.3.1.dmg" className={styles.donate}>
                  Download for macOS
                </a>
              </p>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  )
}
