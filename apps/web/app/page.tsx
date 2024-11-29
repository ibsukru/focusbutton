import { FocusButton } from "@focusbutton/ui";
import styles from "./page.module.scss";
// import { ChromeIcon } from "lucide-react";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <FocusButton />
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
