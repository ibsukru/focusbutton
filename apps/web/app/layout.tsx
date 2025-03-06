import Splash from "./Splash"
import ServiceWorkerRegistration from "./ServiceWorkerRegistration"

import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import { Analytics } from "@vercel/analytics/react"

// import { GoogleAnalytics } from "@next/third-parties/google";

import "normalize.css"
import "./globals.scss"

export const metadata: Metadata = {
  title: "FocusButton",
  description: "A minimalist focus timer for productivity",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FocusButton",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "FocusButton",
    "apple-mobile-web-app-title": "FocusButton",
    "theme-color": "#000000",
    "msapplication-navbutton-color": "#000000",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-starturl": "/",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isDev = process.env.NODE_ENV === "development"

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <Splash />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme={"system"}
          enableSystem={true}
          disableTransitionOnChange
        >
          <ServiceWorkerRegistration />
          {children}
          <Analytics />
        </ThemeProvider>
        {!isDev && <Analytics />}
        {/* {!isDev && <GoogleAnalytics gaId="G-JWGLMW333E" />} */}
      </body>
    </html>
  )
}
