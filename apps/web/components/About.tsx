"use client";

import { useTheme } from "next-themes";
import React, { useEffect } from "react";
import clsx from "clsx";
import styles from "./About.module.scss";
import { FaChrome, FaFirefoxBrowser } from "react-icons/fa";

interface AboutProps {
  className?: string;
}

export default function About({ className }: AboutProps) {
  const { resolvedTheme } = useTheme();

  const [mounted, setMounted] = React.useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={clsx(
        styles.about,
        resolvedTheme === "dark" ? styles.dark : styles.light,
        className,
      )}
    >
      <h1>✨FocusButton</h1>
      <div className={styles.aboutContent}>
        <p>
          🎯 Focus Button is your ultimate productivity companion, available
          both as a web tool and browser extension. In today&apos;s digital
          world, staying focused can be challenging with countless distracting
          websites just a click away. That&apos;s where Focus Button comes in -
          offering a seamless solution to maintain your concentration and boost
          productivity.
        </p>

        <p>
          🚀 Whether you choose to use our instant web version or install our
          powerful browser extension, Focus Button helps you take control of
          your browsing habits. With a simple click, you can temporarily block
          distracting sites, allowing you to focus on what truly matters. The
          web version requires no installation - just visit and click, while our
          browser extensions offer enhanced features and permanent accessibility
          right in your browser.
        </p>

        <div className={styles.features}>
          <h3>🌟 Key Features:</h3>
          <ul>
            <li>
              ⚡️ Instant web access - no installation required for the web
              version
            </li>
            <li>
              🔌 Browser extensions for Chrome and Firefox for enhanced
              functionality
            </li>
            <li>💫 Simple and intuitive interface across all platforms</li>
            <li>
              🔄 Seamless synchronization between devices (with extension)
            </li>
            <li>🔒 Privacy-focused - your data stays on your device</li>
            <li>⚙️ Zero configuration needed - works right out of the box</li>
            <li>📈 Regular updates and improvements</li>
          </ul>
        </div>

        <div className={styles.versions}>
          <h3>📦 Available Versions:</h3>
          <div className={styles.versionsList}>
            <div className={styles.version}>
              <h4>🌐 Web Version</h4>
              <p>
                Access instantly through your browser - perfect for quick focus
                sessions or trying out the service. No installation required,
                just visit and start focusing.
              </p>
            </div>
            <div className={styles.version}>
              <h4>🧩 Browser Extensions</h4>
              <p>
                Get enhanced features and permanent access with our browser
                extensions. Install once and have Focus Button always at your
                fingertips, with additional customization options and seamless
                integration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
