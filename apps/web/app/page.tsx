import { FocusButton } from "@focusbutton/ui";
import { FaFirefoxBrowser } from "react-icons/fa";
import { FaChrome } from "react-icons/fa";
import { getUserAgentInfo } from "../utils/userAgent";

import styles from "./page.module.scss";
import { FaGithub } from "react-icons/fa";
import Footer from "components/Footer";
import About from "components/About";

export default async function Home() {
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
        <div className={styles.content}>
          <div className={styles.focusButton}>
            <FocusButton />
          </div>
          <Footer
            className={styles.footer}
            isDesktop={isDesktop}
            isChrome={isChrome}
            isFirefox={isFirefox}
          />
        </div>
        <About className={styles.about} />
      </main>
    </div>
  );
}
