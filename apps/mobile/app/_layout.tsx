import { Stack } from "expo-router"
import { useColorScheme } from "react-native"
import { ThemeProvider } from "@/components/ThemeProvider"
import * as SplashScreen from "expo-splash-screen"
import { useEffect } from "react"

import "react-native-reanimated"

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const colorScheme = useColorScheme()

  useEffect(() => {
    // Hide the splash screen after the app is ready
    SplashScreen.hideAsync()
  }, [])

  return (
    <ThemeProvider value={colorScheme === "dark" ? "dark" : "light"}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ThemeProvider>
  )
}
