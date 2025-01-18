import React from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider } from "next-themes"
import { FocusButton } from "@focusbutton/ui"
import "./globals.css"
import styles from "./index.module.css"

function Popup() {
  return (
    <ThemeProvider attribute="class">
      <div className={styles.page}>
        <div className={styles.main}>
          <FocusButton />
        </div>
      </div>
    </ThemeProvider>
  )
}

const container = document.getElementById("root")
if (!container) {
  throw new Error("Root element not found")
}

const root = createRoot(container)
root.render(<Popup />)

// Remove service worker registration since we're using manifest v3 background service worker
