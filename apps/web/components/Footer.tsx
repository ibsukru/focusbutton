"use client";

import React from "react";

import { FaChrome, FaFirefoxBrowser } from "react-icons/fa";
import clsx from "clsx";
import styles from "./Footer.module.scss";

export default function Footer({
  isDesktop,
  isChrome,
  isFirefox,
  className,
  isMacOs,
}: {
  isDesktop: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  className?: string;
  isMacOs?: boolean;
}) {
  const isExtensionEnabled = true;

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
      <div className={styles.webStoreLinks}>
        {isDesktop &&
          isExtensionEnabled &&
          (isChrome ? (
            <>
              <a
                className={styles.webStore}
                href="https://chromewebstore.google.com/detail/focusbutton/nkomoiomfaeodakglkihapminhpgnibl?authuser=0&hl=en&pli=1"
              >
                <span style={{ width: 20, height: 20 }}>
                  <FaChrome title="Chrome Web Store" size={20} />
                </span>
                Chrome
              </a>
              |{" "}
            </>
          ) : isFirefox ? (
            <>
              <a
                className={styles.webStore}
                href="https://addons.mozilla.org/en-US/firefox/addon/focusbutton"
              >
                <FaFirefoxBrowser title="Download from Firefox Add-on Store" />
              </a>
              Firefox |{" "}
            </>
          ) : null)}
        {/* {isDesktop && isMacOs ? (
          <>
            <a href="/FocusButton-1.3.1.dmg" className={styles.donate}>
              🖥 macOS
            </a>{" "}
            |{" "}
          </>
        ) : null} */}
        <a
          target="_blank"
          rel="noreferrer"
          href="https://buymeacoffee.com/ibsukru"
          className={styles.donate}
        >
          Donate
        </a>
      </div>
    </div>
  );
}
