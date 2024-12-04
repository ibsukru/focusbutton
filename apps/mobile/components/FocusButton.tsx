import React, { useState, useEffect } from "react";
import { TouchableOpacity, StyleSheet, View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedView } from "./ThemedView";
import { ThemedText } from "./ThemedText";
import { Ionicons } from "@expo/vector-icons";

export function FocusButton() {
  const [isActive, setIsActive] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [upPressed, setUpPressed] = useState(false);
  const [downPressed, setDownPressed] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [adjustInterval, setAdjustInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [pressInterval, setPressInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  const styles = getStyles(isDarkTheme);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            clearInterval(interval);
            setIsActive(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, seconds]);

  const clearActiveInterval = () => {
    if (adjustInterval) {
      clearInterval(adjustInterval);
      setAdjustInterval(null);
    }
  };

  useEffect(() => {
    if (upPressed) {
      clearActiveInterval();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const interval = setInterval(() => {
        if (minutes >= 60) {
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
        if (minutes === 0 && seconds === 0) {
          clearActiveInterval();
          return;
        }
        setSeconds((prev) => {
          const newSeconds = prev - 1;
          if (prev === 0) {
            if (minutes > 0) {
              setMinutes((m) => Math.max(m - 1, 0));
              return 19;
            }
            return 0;
          }
          return newSeconds;
        });
      }, 16);
      setAdjustInterval(interval);
    } else {
      clearActiveInterval();
    }

    return () => clearActiveInterval();
  }, [upPressed, downPressed]);

  useEffect(() => {
    return () => {
      if (pressInterval) {
        clearInterval(pressInterval);
        setPressInterval(null);
      }
    };
  }, []);

  const incrementMinutes = () => {
    if (minutes >= 60) return;

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

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.mainContainer,
          { backgroundColor: isDarkTheme ? "#000" : "#fff" },
        ]}
      >
        <View style={styles.timerWrapper}>
          <View style={styles.timerContainer}>
            <TouchableOpacity
              style={[
                styles.timerCircle,
                { backgroundColor: isDarkTheme ? "#000" : "#fff" },
              ]}
              onPress={() => setIsDarkTheme((prev) => !prev)}
            >
              <View style={styles.timerInner}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={decrementMinutes}
                  onPressIn={() => setDownPressed(true)}
                  onPressOut={() => setDownPressed(false)}
                  style={styles.arrowButton}
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
                  style={styles.arrowButton}
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
      flex: 1,
      backgroundColor: "#000",
    },
    visible: {
      opacity: 1,
    },
    mainContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    timerWrapper: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    timerContainer: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    timerCircle: {
      width: 250,
      height: 250,
      borderRadius: 125,
      borderWidth: 1,
      borderColor: "#4CAF50",
      alignItems: "center",
      justifyContent: "center",
    },
    timerInner: {
      alignItems: "center",
      justifyContent: "center",
      display: "flex",
      flexDirection: "row",
    },
    arrowButton: {
      padding: 10,
    },
    timerText: {
      fontSize: 48,
      fontWeight: "400",
      color: isDarkTheme ? "#fff" : "#000",
      lineHeight: 48,
    },
    timeContainer: {
      minWidth: 130,
      alignItems: "center",
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
      borderColor: "#333",
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
  });
