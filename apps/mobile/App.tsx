import { useEffect } from "react"
import { StyleSheet, View } from "react-native"
import { FocusButton } from "./components/FocusButton"
import * as Notifications from "expo-notifications"
import { registerForPushNotificationsAsync } from "./utils/notifications"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync()
  }, [])

  return (
    <View style={styles.container}>
      <FocusButton />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
})
