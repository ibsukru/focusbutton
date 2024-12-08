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
    isDesktop &&
    isExtensionEnabled &&
    (isChrome ? (
      <div className={clsx(styles.footer, className)}>
        {mounted &&
          (resolvedTheme === "dark" ? (
            <a
              href="https://www.producthunt.com/posts/focus-button?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-focus&#0045;button"
              target="_blank"
            >
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=686086&theme=dark"
                alt="Focus&#0032;Button - A&#0032;minimalist&#0032;focus&#0032;timer&#0032;for&#0032;productivity | Product Hunt"
                width="250"
                height="54"
              />
            </a>
          ) : (
            <a
              href="https://www.producthunt.com/posts/focus-button?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-focus&#0045;button"
              target="_blank"
            >
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=686086&theme=neutral"
                alt="Focus&#0032;Button - A&#0032;minimalist&#0032;focus&#0032;timer&#0032;for&#0032;productivity | Product Hunt"
                width="250"
                height="54"
              />
            </a>
          ))}
        <div className={styles.links}>
          <a
            className={styles.webStore}
            href="https://chromewebstore.google.com/detail/focusbutton/nkomoiomfaeodakglkihapminhpgnibl?authuser=0&hl=en&pli=1"
          >
            <FaChrome /> Download from Chrome Web Store
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
      </div>
    ) : isFirefox ? (
      <div className={styles.footer}>
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
    ) : null)
  );
}
