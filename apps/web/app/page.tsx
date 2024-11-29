import { useState, useRef, useEffect } from "react";
import styles from "./page.module.scss";
import { ChevronDown, ChevronUp, Focus } from "lucide-react";
import MotionNumber from "motion-number";
import { FocusButton } from "@focusbutton/ui";

const STORAGE_KEY = "focusbutton_timer_state";

interface TimerState {
  time: number;
  isCountingDown: boolean;
  isPaused: boolean;
  startTime: number;
}

export default function Home() {
  return <FocusButton />;
}
