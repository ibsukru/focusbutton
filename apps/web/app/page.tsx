import { FocusButton } from "@focusbutton/ui";
import { FaFirefoxBrowser } from "react-icons/fa";
import { FaChrome } from "react-icons/fa";
import { getUserAgentInfo } from "../utils/userAgent";

import styles from "./page.module.scss";
import { FaGithub } from "react-icons/fa";

export default async function Home() {
  const isExtensionEnabled = true;
  const { isDesktop, isChrome, isFirefox } = await getUserAgentInfo();

  return (
    <div className={styles.page}>
      <a
        className={styles.github}
        href="https://github.com/ibsukru/focusbutton"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FaGithub size={20} />
      </a>
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.content}>
            <FocusButton />
            {isDesktop &&
              isExtensionEnabled &&
              (isChrome ? (
                <div className={styles.footer}>
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
              ) : null)}
          </div>
        </div>
      </main>
    </div>
  );
}
