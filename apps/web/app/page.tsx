import { FocusButton } from "@focusbutton/ui";
import { FaFirefoxBrowser } from "react-icons/fa";
import { FaChrome } from "react-icons/fa";
import { getUserAgentInfo } from "../utils/userAgent";

import styles from "./page.module.scss";

export default async function Home() {
  const isExtensionEnabled = true;
  const { isDesktop, isChrome, isFirefox } = await getUserAgentInfo();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.content}>
            <FocusButton />
            {isDesktop &&
              !isExtensionEnabled &&
              (isChrome ? (
                <a
                  className={styles.webStore}
                  href="https://chromewebstore.google.com/detail/focusbutton/nkomoiomfaeodakglkihapminhpgnibl?authuser=0&hl=en&pli=1"
                >
                  <FaChrome /> Download from Chrome Web Store
                </a>
              ) : isFirefox ? (
                <a
                  className={styles.webStore}
                  href="https://addons.mozilla.org/en-US/firefox/addon/focusbutton"
                >
                  <FaFirefoxBrowser />
                  Download from Firefox Add-on Store
                </a>
              ) : null)}
          </div>
        </div>
      </main>
    </div>
  );
}
