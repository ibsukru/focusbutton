"use client";

import React from "react";

import { FaChrome, FaFirefoxBrowser } from "react-icons/fa";
import clsx from "clsx";
import styles from "./Footer.module.scss";
import { useTheme } from "next-themes";

export default function Footer({
  isDesktop,
  isChrome,
  isFirefox,
  className,
}: {
  isDesktop: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  className?: string;
}) {
  const isExtensionEnabled = true;
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={clsx(styles.footer, className)}>
      <a
        className={clsx("button", styles.feedbackWallet)}
        target="_blank"
        rel="noreferrer"
        href="https://feedbackwallet.com/teams/99ddcab9-99d6-41bd-8547-e3e08d0fb761"
      >
        <img width={20} height={20} src="/frog-128.webp" alt="FeedbackWallet" />{" "}
        FeedbackWallet
      </a>
      {isDesktop &&
        isExtensionEnabled &&
        (isChrome ? (
          <>
            <div className={styles.webStoreLinks}>
              <a
                className={styles.webStore}
                href="https://chromewebstore.google.com/detail/focusbutton/nkomoiomfaeodakglkihapminhpgnibl?authuser=0&hl=en&pli=1"
              >
                <span style={{ width: 20, height: 20 }}>
                  <FaChrome size={20} />
                </span>{" "}
                Download from Chrome Web Store
              </a>
              |{" "}
              <a
                target="_blank"
                rel="noreferrer"
                href="https://buymeacoffee.com/ibsukru"
                className={styles.donate}
              >
                Donate
              </a>
            </div>
          </>
        ) : isFirefox ? (
          <>
            <div className={styles.webStoreLinks}>
              <a
                className={styles.webStore}
                href="https://addons.mozilla.org/en-US/firefox/addon/focusbutton"
              >
                <FaFirefoxBrowser />
                Download from Firefox Add-on Store
              </a>
              |{" "}
              <a
                target="_blank"
                rel="noreferrer"
                href="https://buymeacoffee.com/ibsukru"
                className={styles.donate}
              >
                Donate
              </a>
            </div>
          </>
        ) : null)}
    </div>
  );
}
