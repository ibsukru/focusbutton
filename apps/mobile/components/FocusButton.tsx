import React, { useState, useEffect, useRef } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { ThemedView } from "./ThemedView";
import { ThemedText } from "./ThemedText";
import { Ionicons } from "@expo/vector-icons";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function FocusButton() {
  const [isActive, setIsActive] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [upPressed, setUpPressed] = useState(false);
  const [downPressed, setDownPressed] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);
  const [adjustInterval, setAdjustInterval] = useState<NodeJS.Timeout | null>(
    null,
  );
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    registerForPushNotificationsAsync();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
      });

    return () => {
      Notifications.removeNotificationSubscription(
        notificationListener.current,
      );
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  async function registerForPushNotificationsAsync() {
    if (Platform.OS === "ios") {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      setHasNotificationPermission(finalStatus === "granted");
    }
  }

  async function scheduleNotification() {
    if (!hasNotificationPermission) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Time's up!",
          body: "Your focus session has ended!",
          sound: "timer_end.mp3",
          data: { data: "goes here" },
        },
        trigger: null, // null means show immediately
      });
    } catch (error) {
      console.log("Error scheduling notification:", error);
    }
  }

  const isPaused = (minutes > 0 || seconds > 0) && !isActive;
  const isCountingDown = minutes > 0 || (seconds > 0 && isActive);

  const minutesRef = useRef(minutes);
  const secondsRef = useRef(seconds);
  const tiltAnimation = useRef(new Animated.Value(0)).current;

  const Tilt = () => {
    Animated.sequence([
      Animated.timing(tiltAnimation, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(tiltAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(tiltAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(tiltAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    minutesRef.current = minutes;
  }, [minutes]);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    if (
      seconds === 0 &&
      minutes === 0 &&
      !isCountingDown &&
      !upPressed &&
      !downPressed &&
      isActive
    ) {
      Tilt();
      scheduleNotification();
      setIsActive(false);
    }
  }, [seconds, minutes, isCountingDown, upPressed, downPressed, isActive]);

  useEffect(() => {
    if (upPressed && Platform.OS === "android") {
      const interval = setInterval(() => {
        setMinutes((prev) => Math.min(prev + 1, 60));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [upPressed]);

  useEffect(() => {
    if (downPressed && Platform.OS === "android") {
      const interval = setInterval(() => {
        setMinutes((prev) => Math.max(prev - 1, 0));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [downPressed]);

  useEffect(() => {
    if (upPressed) {
      registerForPushNotificationsAsync();
      clearActiveInterval();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const interval = setInterval(() => {
        if (minutesRef.current >= 60) {
          clearActiveInterval();
          setMinutes(60);
          setSeconds(0);
          return;
        }

        setSeconds((prev) => {
          const newSeconds = prev + 1;
          if (newSeconds >= 20) {
            setMinutes((m) => Math.min(m + 1, 60));
            return 0;
          }
          return newSeconds;
        });
      }, 16);
      setAdjustInterval(interval);
    } else if (downPressed) {
      clearActiveInterval();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const interval = setInterval(() => {
        console.log("Interval tick", {
          minutes: minutesRef.current,
          seconds: secondsRef.current,
        });

        if (minutesRef.current === 0 && secondsRef.current === 0) {
          console.log("Timer at zero, clearing interval");
          clearActiveInterval();
          return;
        }

        setSeconds((prev) => {
          console.log("Updating seconds", {
            prev,
            minutes: minutesRef.current,
          });
          const newSeconds = prev - 1;

          if (prev === 0) {
            if (minutesRef.current > 0) {
              console.log("Decrementing minutes", {
                minutes: minutesRef.current,
              });
              setMinutes((m) => {
                const newMinutes = Math.max(m - 1, 0);
                console.log("New minutes value", { newMinutes });
                if (newMinutes === 0) {
                  clearActiveInterval();
                }
                return newMinutes;
              });
              return 19;
            }
            console.log("At zero, should stop");
            clearActiveInterval();
            return 0;
          }
          return newSeconds;
        });
      }, 16);
      console.log("Setting new interval");
      setAdjustInterval(interval);
    } else {
      clearActiveInterval();
    }

    return () => clearActiveInterval();
  }, [upPressed, downPressed]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        setSeconds((prevSeconds) => {
          if (prevSeconds === 0) {
            if (minutes === 0) {
              clearInterval(interval);
              setIsActive(false);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              scheduleNotification();
              return 0;
            } else {
              setMinutes((prevMinutes) => prevMinutes - 1);
              return 59;
            }
          }
          return prevSeconds - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, seconds]);

  const incrementMinutes = () => {
    if (minutes >= 60) return;

    if (Platform.OS === "android") {
      setMinutes((prev) => Math.min(prev + 5, 60));
      return;
    }

    clearActiveInterval();
    let targetMinutes = Math.min(minutes + 5, 60);
    const interval = setInterval(() => {
      if (minutes >= targetMinutes) {
        clearInterval(interval);
        setAdjustInterval(null);
        return;
      }
      setSeconds((prev) => {
        const newSeconds = prev + 1;
        if (newSeconds >= 20) {
          setMinutes((m) => Math.min(m + 1, targetMinutes));
          return 0;
        }
        return newSeconds;
      });
    }, 16);
    setAdjustInterval(interval);

    if (!isActive) {
      setIsActive(true);
    }
  };

  const decrementMinutes = () => {
    if (minutes === 0 && seconds === 0) return;

    if (Platform.OS === "android") {
      setMinutes((prev) => Math.max(prev - 5, 0));
      return;
    }

    clearActiveInterval();
    let targetMinutes = Math.max(minutes - 5, 0);
    const interval = setInterval(() => {
      if (minutes <= targetMinutes && seconds === 0) {
        clearInterval(interval);
        setAdjustInterval(null);
        return;
      }
      setSeconds((prev) => {
        const newSeconds = prev - 1;
        if (prev === 0) {
          if (minutes > targetMinutes) {
            setMinutes((m) => Math.max(m - 1, targetMinutes));
            return 19;
          }
          return 0;
        }
        return newSeconds;
      });
    }, 16);
    setAdjustInterval(interval);

    if (!isActive) {
      setIsActive(true);
    }
  };

  const clearActiveInterval = () => {
    if (adjustInterval) {
      console.log("Clearing interval", {
        minutes: minutesRef.current,
        seconds: secondsRef.current,
      });
      clearInterval(adjustInterval);
      setAdjustInterval(null);
    }
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const styles = getStyles(isDarkTheme);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.mainContainer]}>
        <View style={styles.timerWrapper}>
          <View style={styles.timerContainer}>
            <Animated.View
              style={[
                styles.timerCircle,
                isCountingDown && styles.countingDown,
                isPaused && styles.paused,
                {
                  transform: [
                    {
                      rotate: tiltAnimation.interpolate({
                        inputRange: [-10, 0, 10],
                        outputRange: ["-10deg", "0deg", "10deg"],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={() => setIsDarkTheme((prev) => !prev)}
              >
                <View style={styles.timerInner}>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={decrementMinutes}
                    onPressIn={() => setDownPressed(true)}
                    onPressOut={() => setDownPressed(false)}
                    style={[styles.arrowButton, styles.leftArrow]}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={
                        downPressed
                          ? isDarkTheme
                            ? "#fff"
                            : "#000"
                          : isDarkTheme
                            ? "#ccc"
                            : "#333"
                      }
                    />
                  </TouchableOpacity>
                  <View style={styles.timeContainer}>
                    <ThemedText style={[styles.timerText]}>
                      {formatTime(minutes, seconds)}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={incrementMinutes}
                    onPressIn={() => setUpPressed(true)}
                    onPressOut={() => setUpPressed(false)}
                    style={[styles.arrowButton, styles.rightArrow]}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={20}
                      color={
                        upPressed
                          ? isDarkTheme
                            ? "#fff"
                            : "#000"
                          : isDarkTheme
                            ? "#ccc"
                            : "#333"
                      }
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
          <View
            style={[
              styles.controlsContainer,
              (minutes > 0 || seconds > 0) && styles.visible,
            ]}
          >
            <TouchableOpacity
              style={[styles.controlButton]}
              onPress={() => setIsActive(!isActive)}
              activeOpacity={1}
            >
              {isActive ? (
                <>
                  <Ionicons style={styles.controlIcon} size={16} name="pause" />
                  <ThemedText style={styles.controlText}>Pause</ThemedText>
                </>
              ) : (
                <>
                  <Ionicons style={styles.controlIcon} size={16} name="play" />
                  <ThemedText style={styles.controlText}>Resume</ThemedText>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton]}
              onPress={() => {
                setIsActive(false);
                setMinutes(0);
                setSeconds(0);
                clearActiveInterval();
              }}
            >
              <Ionicons style={styles.controlIcon} name="close" size={16} />
              <ThemedText style={styles.controlText}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const getStyles = (isDarkTheme: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: isDarkTheme ? "#000" : "#fff",
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    visible: {
      opacity: 1,
    },
    mainContainer: {
      flex: 1,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    timerWrapper: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    timerContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    timerCircle: {
      width: 250,
      height: 250,
      borderRadius: 125,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      borderColor: isDarkTheme ? "#333" : "#eaeaea",
      backgroundColor: isDarkTheme ? "#000" : "#fff",
    },
    timerInner: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      position: "relative",
    },
    timeContainer: {
      width: 200,
      alignItems: "center",
      justifyContent: "center",
    },
    timerText: {
      fontSize: 48,
      fontWeight: "bold",
      textAlign: "center",
      color: isDarkTheme ? "#fff" : "#000",
      lineHeight: 48,
    },
    arrowButton: {
      padding: 10,
      position: "absolute",
      zIndex: 1,
    },
    leftArrow: {
      left: 10,
    },
    rightArrow: {
      right: 10,
    },
    controlsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 20,
      marginTop: 30,
      zIndex: 1,
      opacity: 0,
    },
    controlButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderColor: isDarkTheme ? "#333" : "#eaeaea",
      borderStyle: "solid",
      borderWidth: 1,
      display: "flex",
      alignItems: "center",
      flexDirection: "row",
      gap: 3,
      backgroundColor: isDarkTheme ? "#000" : "#fff",
    },
    controlText: {
      fontSize: 16,
      color: isDarkTheme ? "#fff" : "#000",
      display: "flex",
      alignItems: "center",
      gap: 3,
    },
    controlIcon: {
      color: isDarkTheme ? "#fff" : "#000",
      width: 16,
      height: 16,
    },
    countingDown: {
      borderColor: "#58aa11",
    },
    paused: {
      borderColor: "#f5a623",
    },
  });
