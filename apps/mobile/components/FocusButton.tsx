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

  const incrementMinutes = () => {
    if (!isActive) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMinutes((prev) => {
        const newMinutes = Math.min(prev + 1, 60);
        setIsActive(true);
        return newMinutes;
      });
    }
  };

  const decrementMinutes = () => {
    if (!isActive) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMinutes((prev) => {
        const newMinutes = Math.max(prev - 1, 1);
        setIsActive(true);
        return newMinutes;
      });
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
                <ThemedText style={styles.timerText}>
                  <TouchableOpacity
                    onPress={incrementMinutes}
                    style={styles.arrowButton}
                  >
                    <Ionicons name="chevron-up" size={20} color="#666" />
                  </TouchableOpacity>
                  {formatTime(minutes, seconds)}
                  <TouchableOpacity
                    onPress={decrementMinutes}
                    style={styles.arrowButton}
                  >
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </ThemedText>
              </View>
            </View>
          </View>
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setIsActive(!isActive)}
            >
              <ThemedText style={styles.controlText}>
                {isActive ? "Pause" : "Resume"}
              </ThemedText>
            </TouchableOpacity>

            {isActive && (
              <TouchableOpacity
                style={[styles.controlButton, styles.cancelButton]}
                onPress={() => {
                  setIsActive(false);
                  setSeconds(0);
                }}
              >
                <ThemedText style={styles.controlText}>Cancel</ThemedText>
              </TouchableOpacity>
            )}
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
  mainContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timerWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 30,
  },
  timerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  timerCircle: {
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  timerInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  arrowButton: {
    padding: 10,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "400",
    color: "#fff",
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 30,
    zIndex: 1,
  },
  controlButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "#333",
  },
  cancelButton: {
    backgroundColor: "#444",
  },
  controlText: {
    fontSize: 16,
    color: "#fff",
  },
});
