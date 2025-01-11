import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { GoogleAnalytics } from "@next/third-parties/google";

import "./globals.css";

export const metadata: Metadata = {
  title: "FocusButton",
  description: "Focus mode timer for macOS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme={"system"}
          enableSystem={true}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        {!isDev && <GoogleAnalytics gaId="G-JWGLMW333E" />}
      </body>
    </html>
  );
}
