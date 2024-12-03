import { FocusButton } from "@focusbutton/ui";
import styles from "./page.module.scss";
import { FaFirefoxBrowser } from "react-icons/fa";
import { FaChrome } from "react-icons/fa";
import { getUserAgentInfo } from "../utils/userAgent";

export default async function Home() {
  const isExtensionEnabled = false;
  const { isDesktop, isChrome, isFirefox } = await getUserAgentInfo();

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <FocusButton />
        {(() => {
          if (!isExtensionEnabled) return null;
          if (!isDesktop) return null;

          if (isChrome)
            return (
              <a
                className={styles.chromeWebStore}
                href="https://chrome.google.com/webstore/detail/focusbutton/njgjgjgjgjgjgjgjgjgj"
              >
                <FaChrome /> Download from Chrome Web Store
              </a>
            );

          if (isFirefox)
            return (
              <a
                className={styles.chromeWebStore}
                href="https://addons.mozilla.org/en-US/firefox/addon/focusbutton/"
              >
                <FaFirefoxBrowser />
                Download from Firefox Add-on Store
              </a>
            );
        })()}
        {/* <a
            className={styles.chromeWebStore}
            href="https://chrome.google.com/webstore/detail/focusbutton/njgjgjgjgjgjgjgjgjgj"
          >
            <ChromeIcon /> Download from Chrome Web Store
          </a> */}
      </div>
    </div>
  );
}
