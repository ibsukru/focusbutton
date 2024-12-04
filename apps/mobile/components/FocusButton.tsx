import React, { useState, useEffect } from "react";
import { TouchableOpacity, StyleSheet, View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedView } from "./ThemedView";
import { ThemedText } from "./ThemedText";
import { Ionicons } from "@expo/vector-icons";

export function FocusButton() {
  const [isActive, setIsActive] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [upPressed, setUpPressed] = useState(false);
  const [downPressed, setDownPressed] = useState(false);
  const [adjustInterval, setAdjustInterval] = useState<NodeJS.Timeout | null>(
    null
  );

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

  useEffect(() => {
    if (upPressed) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let count = 0;
      const interval = setInterval(() => {
        count++;
        if (count === 20) {
          setMinutes((m) => Math.min(m + 1, 60));
          count = 0;
        }
        setSeconds((prev) => (prev + 1) % 60);
      }, 16); // Approximately 60 updates per second
      setAdjustInterval(interval);
    } else if (downPressed) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let count = 0;
      const interval = setInterval(() => {
        count++;
        if (count === 20) {
          setMinutes((m) => {
            const newMinutes = Math.max(m - 1, 1);
            return newMinutes;
          });
          count = 0;
        }
        setSeconds((prev) => {
          if (prev === 0) return 59;
          return prev - 1;
        });
      }, 16); // Approximately 60 updates per second
      setAdjustInterval(interval);
    } else if (adjustInterval) {
      clearInterval(adjustInterval);
      setAdjustInterval(null);
    }

    return () => {
      if (adjustInterval) {
        clearInterval(adjustInterval);
        setAdjustInterval(null);
      }
    };
  }, [upPressed, downPressed]);

  const incrementMinutes = () => {
    setMinutes((prev) => Math.min(prev + 1, 60));
    if (!isActive) {
      setIsActive(true);
    }
  };

  const decrementMinutes = () => {
    setMinutes((prev) => Math.max(prev - 1, 1));
    if (!isActive) {
      setIsActive(true);
    }
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mainContainer}>
        <View style={styles.timerWrapper}>
          <View style={styles.timerContainer}>
            <View style={styles.timerCircle}>
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
                    color={downPressed ? "#fff" : "#666"}
                  />
                </TouchableOpacity>
                <View style={styles.timeContainer}>
                  <ThemedText style={styles.timerText}>
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
                    color={upPressed ? "#fff" : "#666"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.controlsContainer,
              (minutes > 0 || seconds > 0) && styles.visible,
            ]}
          >
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setIsActive(!isActive)}
            >
              <ThemedText style={styles.controlText}>
                {isActive ? "Pause" : "Resume"}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.cancelButton]}
              onPress={() => {
                setIsActive(false);
                setMinutes(0);
                setSeconds(0);
              }}
            >
              <ThemedText style={styles.controlText}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
    color: "#fff",
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
    backgroundColor: "#000",
    borderColor: "#333",
    borderStyle: "solid",
    borderWidth: 1,
  },
  cancelButton: {},
  controlText: {
    fontSize: 16,
    color: "#fff",
  },
});
