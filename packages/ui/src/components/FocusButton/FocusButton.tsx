"use client"

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import styles from "./FocusButton.module.scss"
import {
  AlarmClockCheck,
  ChartColumnBig,
  ChevronDown,
  ChevronUp,
  CirclePause,
  CirclePlay,
  CircleX,
  GripVertical,
  Moon,
  Pencil,
  SettingsIcon,
  Sun,
  Trash2,
} from "lucide-react"
import type { BrowserAPIType } from "@focusbutton/extension/src/browser-api"
import { useTheme } from "next-themes"
import clsx from "clsx"
import NumberFlow from "@number-flow/react"
import { useLocalStorage } from "../../hooks"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import DraggableItem from "../../components/DraggableItem"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import sanitizeHtml from "sanitize-html"

// Add global type declaration for browser
declare global {
  const browser:
    | {
        storage: {
          local: {
            get: (keys?: string | string[] | object) => Promise<any>
            set: (items: object) => Promise<void>
          }
          onChanged: {
            addListener: (callback: (changes: any) => void) => void
            removeListener: (callback: (changes: any) => void) => void
          }
        }
        runtime: {
          sendMessage: (message: any) => Promise<any>
          onMessage: {
            addListener: (
              callback: (message: any, sender: any, sendResponse: any) => void,
            ) => void
            removeListener: (
              callback: (message: any, sender: any, sendResponse: any) => void,
            ) => void
          }
        }
        notifications: {
          onClicked: {
            addListener: (callback: (notificationId: string) => void) => void
            removeListener: (callback: (notificationId: string) => void) => void
          }
          clear: (notificationId: string) => Promise<void>
        }
        tabs: {
          query: (queryInfo: object) => Promise<any>
          update: (tabId: number, updateProperties: object) => Promise<any>
          create: (createProperties: object) => Promise<any>
        }
        windows: {
          update: (windowId: number, updateInfo: object) => Promise<any>
        }
      }
    | undefined
}

type TimerState = {
  time: number
  isCountingDown: boolean
  isPaused: boolean
  isFinished: boolean
  source?: string
  timestamp?: number
  startTime: number
  isFinalState?: boolean
  isCanceled?: boolean
}

type TimerMessage = {
  type: string
  running?: boolean
  remainingTime?: number
}

type Task = {
  id: string
  title: string
  createdOn: Date
  modifiedOn: Date
  total?: { date: Date; count: number }[]
}

const NewTaskSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
})

const EditTaskSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  id: z.string(),
  createdOn: z.date(),
})

const STORAGE_KEY = "focusbutton_timer_state"
const STORAGE_TASKS_KEY = "focusbutton_tasks"
const STORAGE_TASK_KEY = "focusbutton_task"

const POMODORO_KEY = "focusbutton_active_pomodoro"
const MAX_TIME = 3600 // 60 minutes in seconds

const getBrowserAPI = (): BrowserAPIType | null => {
  if (typeof window === "undefined") return null

  // Check for Chrome API first
  if (typeof chrome !== "undefined" && chrome.runtime) {
    return chrome as unknown as BrowserAPIType
  }

  // Fallback to Firefox API
  if (typeof browser !== "undefined" && (browser as any).runtime?.id) {
    return browser as unknown as BrowserAPIType
  }

  return null
}

// Track events with GA4
const trackEvent = (eventName: string, params = {}) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    ;(window as any).gtag("event", eventName, {
      ...params,
      source: "FocusButton",
    })
  }
}

export default function FocusButton({
  className,
  onTimer,
  onTimerEnd,
  onTimerStart,
  onTimerPause,
  onTimerResume,
  onTimerCancel,
}: {
  onTimer?: (time: number) => void
  onTimerEnd?: () => void
  onTimerStart?: () => void
  onTimerPause?: () => void
  onTimerResume?: () => void
  onTimerCancel?: () => void
  className?: string
}) {
  const [isExtension, setIsExtension] = useState(false)
  const [time, setTime] = useState(0)
  const [displayTime, setDisplayTime] = useState(0)
  const [isCountingDown, setIsCountingDown] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [activePomodoro, setActivePomodoro] = useState<number | null>(null)
  const [tasks, setTasks] = useLocalStorage<Task[]>(STORAGE_TASKS_KEY, [])
  const [addingTask, setAddingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [showReport, setShowReport] = useState(false)
  const [sure, setSure] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [presetMin1, setPresetMin1] = useLocalStorage("presetMin1", 25)
  const [presetMin2, setPresetMin2] = useLocalStorage("presetMin2", 15)
  const [presetMin3, setPresetMin3] = useLocalStorage("presetMin3", 5)
  const [selectedTask, setSelectedTask] = useLocalStorage<Task | undefined>(
    STORAGE_TASK_KEY,
    undefined,
  )
  const { resolvedTheme, setTheme } = useTheme()

  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<any | null>(null)
  const isTimerEndingRef = useRef<Boolean>(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const lastBackgroundStateRef = useRef<any>(null)
  const adjustIntervalRef = useRef<number | null>(null)
  const lastVisibilityUpdateRef = useRef<number>(0)
  const deleteTaskButtonRef = useRef<HTMLButtonElement>(null)
  const secondsUpButtonRef = useRef<HTMLButtonElement>(null)
  const secondsDownButtonRef = useRef<HTMLButtonElement>(null)
  const minutesUpButtonRef = useRef<HTMLButtonElement>(null)
  const minutesDownButtonRef = useRef<HTMLButtonElement>(null)

  const updateThrottleMs = 100

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        deleteTaskButtonRef.current &&
        !deleteTaskButtonRef.current.contains(event.target as Node)
      ) {
        setSure(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (addingTask) {
      ;(
        document.querySelector(
          '#addTaskForm input[name="title"]',
        ) as HTMLInputElement
      )?.focus()
    }
  }, [addingTask])

  useEffect(() => {
    if (editingTask) {
      ;(
        document.querySelector(
          '#editTaskForm input[name="title"]',
        ) as HTMLInputElement
      )?.focus()
    }
  }, [editingTask])

  useEffect(() => {
    if (!selectedTask && tasks?.length) {
      setSelectedTask(tasks?.[0])
    }
  }, [selectedTask, tasks])

  const {
    handleSubmit: handleNewTaskSubmit,
    formState: { errors: newTaskErrors },
    reset: resetNewTask,
    register: registerNewTask,
  } = useForm<z.infer<typeof NewTaskSchema>>({
    mode: "onChange",
    resolver: zodResolver(NewTaskSchema),
    defaultValues: {
      title: "",
    },
  })

  const onAddTask = handleNewTaskSubmit((data) => {
    const now = new Date()
    const updatedTask: Task = {
      id: crypto.randomUUID(),
      title: sanitizeHtml(data.title),
      createdOn: now,
      modifiedOn: now,
      total: [],
    }

    trackEvent("task_add")

    setTasks((prevTasks) => [...prevTasks, updatedTask])
    setAddingTask(false)
    resetNewTask()
  })

  const {
    handleSubmit: handleEditTaskSubmit,
    formState: { errors: editTaskErrors },
    reset: resetEditTask,
    register: registerEditTask,
  } = useForm<z.infer<typeof EditTaskSchema>>({
    mode: "onChange",
    resolver: zodResolver(EditTaskSchema),
    defaultValues: {
      title: editingTask?.title || "",
      id: editingTask?.id || "",
      createdOn: editingTask?.createdOn || new Date(),
    },
  })

  useEffect(() => {
    if (editingTask) {
      resetEditTask({
        title: editingTask.title,
        id: editingTask.id,
        createdOn: editingTask.createdOn,
      })
    }
  }, [editingTask, resetEditTask])

  const onEditTask = handleEditTaskSubmit((data) => {
    if (!editingTask) return

    const now = new Date()
    const updatedTask: Task = {
      ...editingTask,
      title: sanitizeHtml(data.title),
      modifiedOn: now,
    }

    trackEvent("task_edit")

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === editingTask.id ? updatedTask : task,
      ),
    )
    setEditingTask(undefined)
    resetEditTask()
  })

  const [initialMount, setInitialMount] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  useEffect(() => {
    if (isCountingDown && selectedTask && !isPaused) {
      const currentElapsed = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0

      if (currentElapsed > 0) {
        const currentDay = new Date()

        // Update task's total time
        setTasks((prevTasks) =>
          prevTasks.map((task) => {
            if (task.id === selectedTask.id) {
              const hasDay = task.total?.find((t) =>
                isSameDay(new Date(t.date), currentDay),
              )

              return {
                ...task,
                total: hasDay
                  ? task.total?.map((t) => {
                      return {
                        ...t,
                        count: isSameDay(new Date(t.date), currentDay)
                          ? t.count + 1
                          : t.count,
                      }
                    })
                  : task.total?.length
                    ? [...task.total, { date: currentDay, count: 1 }]
                    : [{ date: currentDay, count: 1 }],
              }
            }
            return task
          }),
        )
      }
    }
  }, [time, isCountingDown, selectedTask, isPaused])

  // Check for extension context after mount
  useEffect(() => {
    const checkExtension = () => {
      // Check if we're in a browser extension context
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.id
      ) {
        return true
      }
      // Fallback check for Firefox and other browsers
      if (typeof browser !== "undefined" && (browser as any).runtime?.id) {
        return true
      }
      return false
    }

    setIsExtension(checkExtension())
  }, [])

  // Keep track of current state for comparison
  const currentStateRef = useRef({
    time: 0,
    isCountingDown: false,
    isPaused: false,
    isFinished: false,
  })

  // Update ref whenever state changes
  useEffect(() => {
    currentStateRef.current = {
      time,
      isCountingDown,
      isPaused,
      isFinished,
    }
  }, [time, isCountingDown, isPaused, isFinished])

  useEffect(() => {
    document.title = `${Math.floor(displayTime / 60)
      .toString()
      .padStart(
        2,
        "0",
      )}:${(displayTime % 60).toString().padStart(2, "0")} - FocusButton`
  }, [displayTime])

  const sendMessage = useCallback(
    async (msg: any) => {
      if (!isExtension) return

      try {
        console.log("Sending message:", msg)
        const browserAPI = getBrowserAPI()
        if (!browserAPI) {
          throw new Error("Browser API not available")
        }

        try {
          const response = await browserAPI.runtime.sendMessage(msg)
          console.log("Message response:", response)
          return response
        } catch (error) {
          console.error("Message sending error:", error)
          return null
        }
      } catch (error) {
        console.error("Error in sendMessage:", error)
        return null
      }
    },
    [isExtension],
  )

  const handleTimerEnd = useCallback(() => {
    console.log("Timer reached zero")
    setIsCountingDown(false)
    setIsPaused(false)
    setTime(0)
    setDisplayTime(0)
    setIsFinished(true)

    // Clear timer state immediately
    if (!isExtension) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      const browserAPI = getBrowserAPI()
      if (browserAPI?.storage?.local) {
        browserAPI.storage.local.set({
          [STORAGE_KEY]: {
            type: "TIMER_UPDATE",
            isCountingDown: false,
            time: 0,
            isPaused: false,
            isFinished: true,
            source: "ui",
            timestamp: Date.now(),
          },
        })
      }
    }

    // Clear interval
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    onTimerEnd?.()

    // Play sound and show notification
    if (isExtension) {
      sendMessage({ type: "PLAY_SOUND" })
      sendMessage({ type: "SHOW_NOTIFICATION", title: "Time's up!" })
    } else {
      playNotificationSound()
      sendNotification()
    }
  }, [isExtension, sendMessage])

  const startCountdown = useCallback(
    (duration?: number) => {
      console.log("Starting countdown with duration:", duration ?? time)

      if (duration !== undefined) {
        setTime(duration)
        setDisplayTime(duration)
      }

      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      setIsCountingDown(true)
      setIsPaused(false)
      setIsFinished(false)
      onTimerStart?.()

      const now = Date.now()
      startTimeRef.current = now

      if (isExtension) {
        console.log("Starting extension timer")
        const browserAPI = getBrowserAPI()
        if (browserAPI) {
          // Update extension state
          browserAPI.storage.local.set({
            [STORAGE_KEY]: {
              type: "TIMER_UPDATE",
              isCountingDown: true,
              time: duration ?? time,
              isPaused: false,
              isFinished: false,
              source: "ui",
              timestamp: now,
              startTime: now,
            },
          })

          // Send message to background
          sendMessage({
            type: "START_TIMER",
            time: duration ?? time,
          })
        }
      } else {
        console.log("Starting web timer")
        // Start local timer for web mode
        const initialTime = duration ?? time
        let lastUpdate = now

        timerRef.current = setInterval(() => {
          const currentTime = Date.now()
          const elapsedTime = Math.floor((currentTime - lastUpdate) / 1000)

          if (elapsedTime > 0) {
            lastUpdate = currentTime - ((currentTime - lastUpdate) % 1000)

            setDisplayTime((prevTime) => {
              const newTime = Math.max(0, prevTime - elapsedTime)
              setTime(newTime)

              if (newTime === 0) {
                console.log("Timer reached zero")
                clearInterval(timerRef.current)
                timerRef.current = null
                handleTimerEnd()
              }
              return newTime
            })
          }
        }, 100)

        // Save state to localStorage
        const state: TimerState = {
          time: initialTime,
          isCountingDown: true,
          isPaused: false,
          startTime: now,
          isFinished: false,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      }

      trackEvent("timer_start", { duration: duration || time })
    },
    [time, isExtension, sendMessage, handleTimerEnd],
  )

  const handleCancel = useCallback(() => {
    // Prevent multiple cancellations
    if (isTimerEndingRef.current) {
      return
    }
    isTimerEndingRef.current = true

    // Clear any existing timer interval
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    onTimerCancel?.()

    if (isExtension) {
      const browserAPI = getBrowserAPI()
      if (browserAPI) {
        sendMessage({ type: "STOP_TIMER", isCanceled: true })
        browserAPI.storage.local.set({
          [STORAGE_KEY]: {
            type: "TIMER_UPDATE",
            time: 0,
            isPaused: false,
            isFinished: true,
            source: "web",
            timestamp: Date.now(),
            isFinalState: true,
            isCanceled: true,
          },
        })
      }
    }

    setTime(0)
    setDisplayTime(0)
    setIsCountingDown(false)
    setIsPaused(false)
    setIsFinished(true)

    if (!isExtension) {
      localStorage.removeItem(STORAGE_KEY)
    }

    trackEvent("timer_cancel")

    // Reset the flag after a short delay
    setTimeout(() => {
      isTimerEndingRef.current = false
    }, 1000)
  }, [isExtension, sendMessage])

  const handleClick = () => {
    // Don't handle clicks during adjustment
    if (adjustIntervalRef.current) {
      return
    }

    if (!isCountingDown && time > 0) {
      startCountdown()
    } else if (isCountingDown && !isPaused) {
      handlePause()
    } else if (isPaused) {
      handleResume()
    }
  }

  const handlePause = () => {
    console.log("Pausing timer")

    setIsPaused(true)
    setIsCountingDown(false)

    // Clear interval if running locally
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    onTimerPause?.()

    if (isExtension) {
      sendMessage({ type: "PAUSE_TIMER" })

      // Update storage state
      const state = {
        type: "TIMER_UPDATE",
        isCountingDown: false,
        time: displayTime,
        isPaused: true,
        source: "ui",
        timestamp: Date.now(),
        startTime: startTimeRef.current,
      }

      getBrowserAPI()?.storage.local.set({
        [STORAGE_KEY]: state,
      })
    } else {
      // Update local storage for web version
      const state = {
        type: "TIMER_UPDATE",
        isCountingDown: false,
        time: displayTime,
        isPaused: true,
        source: "ui",
        timestamp: Date.now(),
        startTime: startTimeRef.current,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }

    trackEvent("timer_pause", { timeLeft: time })
  }

  const handleResume = () => {
    console.log("Resuming timer")

    setIsPaused(false)
    setIsCountingDown(true)

    const now = Date.now()
    startTimeRef.current = now

    onTimerResume?.()

    if (isExtension) {
      sendMessage({ type: "RESUME_TIMER" })

      // Ensure storage is updated
      getBrowserAPI()?.storage.local.set({
        [STORAGE_KEY]: {
          type: "TIMER_UPDATE",
          isCountingDown: true,
          time: displayTime,
          isPaused: false,
          source: "ui",
          timestamp: now,
          startTime: startTimeRef.current,
        },
      })
    } else {
      // Start the timer with current remaining time
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // Start countdown with current display time
      startCountdown(displayTime)
    }

    trackEvent("timer_resume", { timeLeft: displayTime })
  }

  const handlePresetTime = (minutes: number) => {
    const newTime = minutes * 60
    setIsPaused(true)
    setIsFinished(false)
    setTime(newTime)
    setDisplayTime(newTime)
    setActivePomodoro(minutes)

    // Stop any running timer
    if (isCountingDown) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setIsCountingDown(false)
    }

    // Save to storage
    if (isExtension) {
      const browserAPI = getBrowserAPI()
      if (browserAPI) {
        sendMessage({
          type: "SET_TIMER",
          time: newTime,
        })

        onTimerPause?.()
        sendMessage({ type: "PAUSE_TIMER" })

        // Save active Pomodoro in extension storage
        browserAPI.storage.local.set({
          [POMODORO_KEY]: minutes.toString(),
        })
      }
    } else {
      // Save timer state
      const state: TimerState = {
        time: newTime,
        isCountingDown: false,
        isPaused: true,
        startTime: Date.now(),
        isFinished: false,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))

      // Save active Pomodoro separately
      localStorage.setItem(POMODORO_KEY, minutes.toString())
    }

    // Track event
    trackEvent("timer_preset", { minutes, timeSet: newTime })
  }

  // Load active Pomodoro from storage
  useEffect(() => {
    const loadPomodoro = async () => {
      if (isExtension) {
        const browserAPI = getBrowserAPI()
        if (browserAPI) {
          const result = await browserAPI.storage.local.get(POMODORO_KEY)
          if (result[POMODORO_KEY]) {
            setActivePomodoro(parseInt(result[POMODORO_KEY]))
          }
        }
      } else {
        const savedPomodoro = localStorage.getItem(POMODORO_KEY)
        if (savedPomodoro) {
          setActivePomodoro(parseInt(savedPomodoro))
        }
      }
    }
    loadPomodoro()
  }, [isExtension])

  // Set mounted state
  useEffect(() => {
    setIsMounted(true)
    // After initial animation, set initialMount to false
    const timer = setTimeout(() => {
      setInitialMount(false)
    }, 300) // slightly longer than animation duration
    return () => clearTimeout(timer)
  }, [])

  // Restore timer state on mount
  const restoreTimerState = useCallback(async () => {
    try {
      let state: TimerState | null = null

      if (isExtension) {
        const response = await sendMessage({
          type: "GET_TIMER_STATE",
        })
        if (response?.success) {
          state = {
            time: response.remainingTime,
            isCountingDown: response.running,
            isPaused: !response.running && response.remainingTime > 0,
            startTime: Date.now(),
            isFinished: false,
          }
        }
      } else {
        const savedState = localStorage.getItem(STORAGE_KEY)
        if (savedState) {
          state = JSON.parse(savedState)
          if (!state) {
            return
          }

          // If timer was running, calculate elapsed time
          if (state.isCountingDown && !state.isPaused && state.startTime) {
            const elapsedTime = Math.floor(
              (Date.now() - state.startTime) / 1000,
            )
            state.time = Math.max(0, state.time - elapsedTime)
          }
        }
      }

      console.log("Restoring timer state:", state)

      if (state) {
        setTime(state.time)
        setDisplayTime(state.time)
        setIsCountingDown(state.isCountingDown)
        setIsPaused(state.isPaused)
        setIsFinished(state.isFinished)

        if (state.startTime) {
          startTimeRef.current = state.startTime
        }

        // If timer was running, restart it
        if (state.isCountingDown && !state.isPaused && state.time > 0) {
          startCountdown(state.time)
        }
      }
    } catch (error) {
      console.error("Error restoring timer state:", error)
    }
  }, [isExtension])

  useEffect(() => {
    restoreTimerState()
  }, [restoreTimerState])

  useEffect(() => {
    if (isCountingDown && !isPaused) {
      onTimer?.(time)
    }
  }, [isCountingDown, isPaused, time])

  // Show controls if timer is set or running
  const showControls = useMemo(() => {
    return (time > 0 && (isCountingDown || isPaused)) || isFinished
  }, [time, isCountingDown, isPaused, isFinished])

  // Listen for timer state changes
  useEffect(() => {
    if (!isExtension) return

    const handleStorageChange = (changes: any) => {
      const timerState = changes[STORAGE_KEY]?.newValue
      if (!timerState || timerState.source === "ui") return

      console.log("Storage state changed:", timerState)

      // Update UI state from background worker
      setTime(timerState.time)
      setDisplayTime(timerState.time)
      setIsCountingDown(timerState.isCountingDown)
      setIsPaused(timerState.isPaused)

      // Handle finished state
      if (timerState.isFinished) {
        console.log("Timer finished, setting finished state")
        setIsFinished(true)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [isExtension])

  // Listen for state changes
  useEffect(() => {
    if (!isExtension) return

    const browserAPI = getBrowserAPI()
    if (!browserAPI) return

    const handleStorageChange = async (changes: any) => {
      const state = changes[STORAGE_KEY]?.newValue
      if (!state) return

      console.log("Storage state updated:", state)

      // Skip if this update was triggered by us and we have a recent update
      const now = Date.now()
      if (
        lastBackgroundStateRef.current?.timestamp &&
        now - lastBackgroundStateRef.current.timestamp < updateThrottleMs
      ) {
        return
      }

      // Update our reference to latest background state
      lastBackgroundStateRef.current = state

      setTime(state.time)
      setDisplayTime(state.time)
      setIsCountingDown(state.isCountingDown)
      setIsPaused(state.isPaused)
      setIsFinished(state.isFinished)
    }

    browserAPI.storage.onChanged.addListener(handleStorageChange)
    return () =>
      browserAPI.storage.onChanged.removeListener(handleStorageChange)
  }, [isExtension])

  // Remove timer message handler since we're using storage
  useEffect(() => {
    if (isExtension) {
      const handleMessage = (message: any) => {
        if (message.type === "PLAY_SOUND") {
          // Skip playing sound in extension mode, handled by offscreen document
          return
        }
      }

      getBrowserAPI()?.runtime.onMessage.addListener(handleMessage)
      return () => {
        getBrowserAPI()?.runtime.onMessage.removeListener(handleMessage)
      }
    }
  }, [])

  const playNotificationSound = async () => {
    // Only play sound in web mode, extension handles it via offscreen document
    if (isExtension) {
      return
    }

    try {
      const audio = new Audio()
      audio.src = "/timer-end.mp3"
      audio.volume = 0.5

      // Initialize audio context if needed
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume()
      }

      // Preload and play
      await audio.load()
      await audio.play().catch((error) => {
        console.log("Audio playback failed:", error)
      })
    } catch (error) {
      console.error("Error playing notification sound:", error)
    }
  }

  const isNotificationSupported = typeof Notification !== "undefined"

  const sendNotification = useCallback(() => {
    if (isExtension) {
      const browserAPI = getBrowserAPI()
      if (browserAPI) {
        browserAPI.notifications.create("timer_end", {
          type: "basic",
          iconUrl: "/icons/icon-128.png",
          title: "Time's up!",
          message: "Your focus session has ended.",
        })
      }
    } else if (isNotificationSupported) {
      try {
        if (Notification.permission === "granted") {
          new Notification("Time's up!", {
            body: "Your focus session has ended.",
            icon: "/icons/icon-128.png",
          })
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission()
            .then((permission) => {
              if (permission === "granted") {
                new Notification("Time's up!", {
                  body: "Your focus session has ended.",
                  icon: "/icons/icon-128.png",
                })
              }
            })
            .catch((error) => {
              console.log("Notification permission request failed:", error)
            })
        }
      } catch (error) {
        console.log("Notification failed:", error)
      }
    }
  }, [isExtension])

  const startAdjustment = (direction: number, isMinutes: boolean = false) => {
    // Stop any running timer
    if (isCountingDown) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setIsCountingDown(false)
      setIsPaused(false)
      setIsFinished(false)
      onTimerPause?.()

      // Clear extension timer state if in extension
      if (isExtension) {
        const browserAPI = getBrowserAPI()
        if (browserAPI) {
          browserAPI.storage.local.remove(STORAGE_KEY)
          sendMessage({ type: "STOP_TIMER", isCanceled: true })
        }
      }
    }

    // Set to paused state when adjusting time
    setIsPaused(true)

    const increment = isMinutes ? 60 : 1 // 60 seconds for minutes, 1 for seconds
    const adjustTime = () => {
      setDisplayTime((prevTime) => {
        const newTime = prevTime + direction * increment
        // Ensure time stays within bounds (0 to 60 minutes)
        const boundedTime = Math.max(0, Math.min(3600, newTime))
        setTime(boundedTime) // Update the actual time state

        // Update extension storage if in extension context
        if (isExtension) {
          const browserAPI = getBrowserAPI()
          if (browserAPI) {
            browserAPI.storage.local.set({
              [STORAGE_KEY]: {
                type: "TIMER_UPDATE",
                isCountingDown: false,
                time: boundedTime,
                isPaused: true,
                isFinished: false,
                source: "ui",
                timestamp: Date.now(),
                startTime: Date.now(),
              },
            })
          }
        }

        return boundedTime
      })
    }

    adjustTime() // Initial adjustment

    if (!adjustIntervalRef.current) {
      // 500ms for minutes, 200ms for seconds
      const intervalTime = isMinutes ? 500 : 200
      adjustIntervalRef.current = window.setInterval(adjustTime, intervalTime)
    }
  }

  const stopAdjustment = () => {
    if (adjustIntervalRef.current) {
      clearInterval(adjustIntervalRef.current)
      adjustIntervalRef.current = null
    }

    // Update storage with final time but keep paused state
    if (isExtension) {
      const browserAPI = getBrowserAPI()
      if (browserAPI) {
        browserAPI.storage.local.set({
          [STORAGE_KEY]: {
            type: "TIMER_UPDATE",
            isCountingDown: false,
            time: time,
            isPaused: true,
            isFinished: false,
            source: "ui",
            timestamp: Date.now(),
            startTime: Date.now(),
          },
        })
      }
    }

    setDisplayTime(time)
  }

  const handleVisibilityChange = useCallback(
    (now: number) => {
      if (document.hidden) {
        return
      }

      // App coming to foreground
      const savedTimer = localStorage.getItem("focusTimer")
      if (savedTimer) {
        try {
          const {
            timeLeft,
            startTime,
            isCountingDown: wasCountingDown,
            isPaused: wasPaused,
          } = JSON.parse(savedTimer)

          if (wasCountingDown && !wasPaused) {
            console.log("App coming to foreground, restoring timer state")
            const elapsedSeconds = Math.floor((now - startTime) / 1000)
            const newTime = Math.max(0, timeLeft - elapsedSeconds)

            if (newTime === 0) {
              console.log("Timer completed while in background")
              handleTimerEnd()
            } else if (newTime > 0) {
              // Resume countdown if time remaining
              startCountdown(newTime)
            }
          }
        } catch (error) {
          console.error("Error parsing saved timer:", error)
        }
        localStorage.removeItem("focusTimer")
      }
    },
    [time, isCountingDown, startCountdown, handleTimerEnd],
  )

  useEffect(() => {
    const handleVisibilityChangeWrapper = () => {
      const now = Date.now()
      // Prevent multiple updates within 1 second
      if (now - lastVisibilityUpdateRef.current < 1000) {
        return
      }
      lastVisibilityUpdateRef.current = now

      handleVisibilityChange(now)
    }

    document.addEventListener("visibilitychange", handleVisibilityChangeWrapper)
    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChangeWrapper,
      )
    }
  }, [handleVisibilityChange])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keys if input is focused
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return
      }

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault()
          secondsUpButtonRef.current?.focus()
          {
            const newTime = Math.min(time + 1, MAX_TIME)
            setTime(newTime)
            setDisplayTime(newTime)
            startCountdown(newTime)
            if (isExtension) {
              const browserAPI = getBrowserAPI()
              if (browserAPI) {
                browserAPI.storage.local.set({
                  [STORAGE_KEY]: {
                    type: "TIMER_UPDATE",
                    isCountingDown: false,
                    time: newTime,
                    isPaused: false,
                    source: "web",
                    timestamp: Date.now(),
                  },
                })
              }
            }
          }
          break

        case "ArrowDown":
          event.preventDefault()
          secondsDownButtonRef.current?.focus()
          {
            const newTime = Math.max(time - 1, 0)
            setTime(newTime)
            startCountdown(newTime)
            setDisplayTime(newTime)
            if (isExtension) {
              const browserAPI = getBrowserAPI()
              if (browserAPI) {
                browserAPI.storage.local.set({
                  [STORAGE_KEY]: {
                    type: "TIMER_UPDATE",
                    isCountingDown: false,
                    time: newTime,
                    isPaused: false,
                    source: "web",
                    timestamp: Date.now(),
                  },
                })
              }
            }
          }
          break

        case " ":
        case "Enter":
          event.preventDefault()
          if (time > 0) {
            if (!isCountingDown || isPaused) {
              const currentTime = time
              startCountdown(currentTime)
            } else {
              handlePause()
            }
          }
          break

        case "Escape":
          if (isCountingDown) {
            handleCancel()
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    time,
    isCountingDown,
    isPaused,
    isExtension,
    startCountdown,
    handlePause,
    handleCancel,
  ])

  useEffect(() => {
    if (isFinished) {
      const timer = setTimeout(() => {
        setIsFinished(false)
      }, 500) // Match animation duration
      return () => clearTimeout(timer)
    }
  }, [isFinished])

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (adjustIntervalRef.current) clearInterval(adjustIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    // Function to get or create the meta tag
    const getOrCreateThemeMetaTag = () => {
      let meta = document.querySelector(
        "meta[name='theme-color']",
      ) as HTMLMetaElement
      if (!meta) {
        meta = document.createElement("meta")
        meta.name = "theme-color"
        document.head.appendChild(meta)
      }
      return meta
    }

    const getOrCreateBackgroundMetaTag = () => {
      let meta = document.querySelector(
        "meta[name='background-color']",
      ) as HTMLMetaElement
      if (!meta) {
        meta = document.createElement("meta")
        meta.name = "background-color"
        document.head.appendChild(meta)
      }
      return meta
    }

    const themeMeta = getOrCreateThemeMetaTag()
    themeMeta.content = resolvedTheme === "dark" ? "#000000" : "#ffffff"

    const backgroundMeta = getOrCreateBackgroundMetaTag()
    backgroundMeta.content = resolvedTheme === "dark" ? "#000000" : "#ffffff"
  }, [resolvedTheme])

  useEffect(() => {
    if (isExtension) {
      const handleMessage = (message: any) => {
        if (message.type === "PLAY_SOUND") {
          // Skip playing sound in extension mode, handled by offscreen document
          return
        }
      }

      getBrowserAPI()?.runtime.onMessage.addListener(handleMessage)
      return () => {
        getBrowserAPI()?.runtime.onMessage.removeListener(handleMessage)
      }
    }
  }, [])

  useEffect(() => {
    if (isExtension) {
      const handleMessage = (message: any) => {
        console.log("Received message:", message)

        if (message.type === "TIMER_UPDATE") {
          console.log("Timer update message:", {
            remainingTime: message.remainingTime,
            running: message.running,
            isPaused: message.isPaused,
          })

          if (message.remainingTime !== undefined) {
            console.log("Updating time to:", message.remainingTime)
            setTime(message.remainingTime)
            setDisplayTime(message.remainingTime)

            // Start or update local timer for smooth UI updates
            if (message.running && !message.isPaused) {
              console.log("Starting local countdown timer")
              if (timerRef.current) {
                console.log("Clearing existing timer")
                clearInterval(timerRef.current)
              }
              timerRef.current = setInterval(() => {
                setDisplayTime((prevTime) => {
                  const newTime = Math.max(0, prevTime - 1)
                  console.log("Local timer update:", newTime)
                  if (newTime === 0) {
                    console.log("Timer reached zero, clearing interval")
                    clearInterval(timerRef.current)
                    timerRef.current = null
                    handleTimerEnd()
                  }
                  return newTime
                })
              }, 1000)
            } else if (timerRef.current) {
              console.log("Stopping local countdown timer")
              clearInterval(timerRef.current)
              timerRef.current = null
            }
          }

          if (message.running !== undefined) {
            console.log("Updating timer state:", {
              running: message.running,
              paused: !message.running,
            })
            setIsCountingDown(message.running)
            setIsPaused(!message.running)
          }
        }
        return true // Required for Chrome extension message handling
      }

      console.log("Setting up message listener")
      chrome.runtime.onMessage.addListener(handleMessage)
      return () => {
        console.log("Cleaning up message listener")
        chrome.runtime.onMessage.removeListener(handleMessage)
        if (timerRef.current) {
          console.log("Cleaning up timer")
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }
  }, [isExtension, handleTimerEnd])

  useEffect(() => {
    if (isExtension) {
      const browserAPI = getBrowserAPI()
      if (!browserAPI) return

      sendMessage({ type: "GET_TIMER_STATE" }).then(
        (response: TimerMessage) => {
          if (response?.running) {
            setTime(response.remainingTime || 0)
            setDisplayTime(response.remainingTime || 0)
            setIsCountingDown(true)
            setIsPaused(false)
          }
        },
      )
    }
  }, [isExtension])

  // Don't render anything until mounted
  if (!isMounted) {
    return
  }

  if (showSettings) {
    return (
      <div className={styles.settingsContainer}>
        <div className={styles.closeSettingsButtonWrapper}>
          <button
            className={styles.closeSettingsButton}
            onClick={() => setShowSettings(false)}
          >
            <CircleX width={14} height={14} /> Presets
          </button>
        </div>
        <div className={styles.settings}>
          <span>
            <input
              type="number"
              min="0"
              max="60"
              placeholder="Minutes"
              defaultValue={presetMin1}
              onChange={(e) => setPresetMin1(Number(e.target.value))}
            />
            min
          </span>
          <span>
            <input
              type="number"
              min="0"
              max="60"
              placeholder="Minutes"
              defaultValue={presetMin2}
              onChange={(e) => setPresetMin2(Number(e.target.value))}
            />
            min
          </span>
          <span>
            <input
              type="number"
              min="0"
              max="60"
              placeholder="Minutes"
              defaultValue={presetMin3}
              onChange={(e) => setPresetMin3(Number(e.target.value))}
            />
            min
          </span>
        </div>
      </div>
    )
  }

  if (showReport) {
    // Process data for the chart
    const allDates = tasks
      .reduce((dates, task) => {
        task.total?.forEach((t) => {
          const dateStr = new Date(t.date).toLocaleDateString()
          if (!dates.includes(dateStr)) {
            dates.push(dateStr)
          }
        })
        return dates
      }, [] as string[])
      .sort()

    const chartData = allDates.map((dateStr) => {
      const dataPoint: any = { date: dateStr }
      tasks.forEach((task) => {
        const dayData = task.total?.find(
          (t) => new Date(t.date).toLocaleDateString() === dateStr,
        )
        dataPoint[task.title] = dayData?.count || 0
      })
      return dataPoint
    })

    return (
      <>
        <div className={styles.reports}>
          <button
            className={styles.reportsButton}
            onClick={() => setShowReport(false)}
          >
            <ChartColumnBig width={14} height={14} /> Close
          </button>
        </div>
        <div className={styles.chartContainer}>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {tasks.map((task, index) => (
                  <Line
                    key={task.id}
                    type="monotone"
                    dataKey={task.title}
                    stroke={`hsl(${(index * 137.5) % 360}, 70%, 50%)`}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className={clsx(styles.page, className)}>
      <main className={styles.main}>
        <div className={styles.pomodoro}>
          <button
            className={clsx(
              styles.timeAdjust,
              displayTime === presetMin1 * 60 &&
                activePomodoro === presetMin1 &&
                styles.active,
            )}
            onClick={(e) => {
              e.stopPropagation()
              handlePresetTime(presetMin1)
              onTimer?.(presetMin1 * 60)
            }}
          >
            {presetMin1}min
          </button>
          <button
            className={clsx(
              styles.timeAdjust,
              displayTime === presetMin2 * 60 &&
                activePomodoro === presetMin2 &&
                styles.active,
            )}
            onClick={(e) => {
              e.stopPropagation()
              handlePresetTime(presetMin2)
              onTimer?.(presetMin2 * 60)
            }}
          >
            {presetMin2}min
          </button>
          <button
            className={clsx(
              styles.timeAdjust,
              displayTime === presetMin3 * 60 &&
                activePomodoro === presetMin3 &&
                styles.active,
            )}
            onClick={(e) => {
              e.stopPropagation()
              handlePresetTime(presetMin3)
              onTimer?.(presetMin3 * 60)
            }}
          >
            {presetMin3}min
          </button>
        </div>
        <div
          className={clsx(
            styles.focusButton,
            initialMount && isMounted && styles.mounted,
            isCountingDown && !isPaused && styles.counting,
            isPaused && styles.paused,
            isFinished && styles.finished,
          )}
        >
          <button
            className={styles.showSettings}
            onClick={() => setShowSettings(true)}
          >
            <SettingsIcon size={20} />
          </button>

          <div className={styles.timeDisplay}>
            <div
              className={styles.time}
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <div className={styles.minutes}>
                <button
                  ref={minutesUpButtonRef}
                  className={styles.timeAdjust}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    if (e.buttons === 1) {
                      startAdjustment(1, true)
                    }
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation()
                    stopAdjustment()
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation()
                    if (adjustIntervalRef.current) {
                      stopAdjustment()
                    }
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                    startAdjustment(1, true)
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation()
                    stopAdjustment()
                  }}
                >
                  <ChevronUp size={16} />
                </button>

                <NumberFlow
                  format={{ minimumIntegerDigits: 2 }}
                  value={Math.floor(displayTime / 60)}
                />

                <button
                  ref={minutesDownButtonRef}
                  className={styles.timeAdjust}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    if (e.buttons === 1) {
                      startAdjustment(-1, true)
                    }
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation()
                    stopAdjustment()
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation()
                    if (adjustIntervalRef.current) {
                      stopAdjustment()
                    }
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                    startAdjustment(-1, true)
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation()
                    stopAdjustment()
                  }}
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              :
              <div className={styles.seconds}>
                <button
                  ref={secondsUpButtonRef}
                  className={styles.timeAdjust}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    if (e.buttons === 1) {
                      startAdjustment(1, false)
                    }
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation()
                    stopAdjustment()
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation()
                    if (adjustIntervalRef.current) {
                      stopAdjustment()
                    }
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                    startAdjustment(1, false)
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation()
                    stopAdjustment()
                  }}
                >
                  <ChevronUp size={16} />
                </button>

                <NumberFlow
                  format={{ minimumIntegerDigits: 2 }}
                  value={displayTime % 60}
                />

                <button
                  ref={secondsDownButtonRef}
                  className={styles.timeAdjust}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    if (e.buttons === 1) {
                      startAdjustment(-1, false)
                    }
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation()
                    stopAdjustment()
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation()
                    if (adjustIntervalRef.current) {
                      stopAdjustment()
                    }
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation()
                    startAdjustment(-1, false)
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation()
                    stopAdjustment()
                  }}
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          </div>
          <button className={styles.themeToggle}>
            {resolvedTheme === "dark" ? (
              <Sun
                className={styles.sun}
                size={20}
                onClick={() => {
                  setTheme("light")
                }}
              />
            ) : (
              <Moon
                className={styles.moon}
                size={20}
                onClick={() => {
                  setTheme("dark")
                }}
              />
            )}
          </button>
        </div>
        <div className={clsx(styles.controls, showControls && styles.visible)}>
          <button onClick={handleClick}>
            {isPaused ? (
              <>
                <CirclePlay width={14} height={14} />
                Start
              </>
            ) : (
              <>
                <CirclePause width={14} height={14} />
                Pause
              </>
            )}
          </button>
          <button onClick={handleCancel}>
            <CircleX width={14} height={14} />
            Cancel
          </button>
        </div>
      </main>
      <div className={styles.taskSection}>
        {(() => {
          if (addingTask) {
            return (
              <form
                id="addTaskForm"
                className={styles.addTask}
                onSubmit={onAddTask}
              >
                <input
                  className={clsx(
                    styles.addTaskInput,
                    newTaskErrors.title && styles.inputError,
                  )}
                  {...registerNewTask("title")}
                  placeholder="Task title"
                  type="text"
                />
                {newTaskErrors.title && (
                  <div className={styles.fieldError}>
                    {newTaskErrors.title?.message}
                  </div>
                )}
                <div className={styles.addTaskButtons}>
                  <button type="submit">Add</button>
                  <button
                    type="button"
                    className={styles.cancelAddTaskButton}
                    onClick={() => {
                      setAddingTask(false)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )
          }

          if (editingTask) {
            return (
              <form
                id="editTaskForm"
                className={styles.editTask}
                onSubmit={onEditTask}
              >
                <input
                  className={clsx(
                    styles.editTaskInput,
                    editTaskErrors.title && styles.inputError,
                  )}
                  {...registerEditTask("title")}
                  placeholder="Task title"
                  type="text"
                />
                {editTaskErrors.title && (
                  <div className={styles.fieldError}>
                    {editTaskErrors.title.message}
                  </div>
                )}
                <input
                  type="hidden"
                  {...registerEditTask("id")}
                  value={editingTask.id}
                />
                <input
                  type="hidden"
                  {...registerEditTask("createdOn", { valueAsDate: true })}
                  value={editingTask.createdOn.toString()}
                />
                <div className={styles.addTaskButtons}>
                  <button type="submit">Save</button>
                  <button
                    type="button"
                    className={styles.cancelEditTaskButton}
                    onClick={() => {
                      setEditingTask(undefined)
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    ref={deleteTaskButtonRef}
                    className={styles.deleteTaskButton}
                    onClick={(e) => {
                      if (!sure) {
                        e.preventDefault()
                        setSure(true)
                        return
                      }

                      setSure(false)

                      trackEvent("task_delete")

                      setTasks(
                        tasks.filter((task) => task.id !== editingTask.id),
                      )
                      setEditingTask(undefined)
                    }}
                  >
                    <Trash2 width={14} height={14} />{" "}
                    {sure ? "Are you sure?" : "Delete"}
                  </button>
                </div>
              </form>
            )
          }

          return (
            <>
              {tasks.length > 0 ? (
                <>
                  <div className={styles.reports}>
                    <button
                      className={styles.reportsButton}
                      onClick={() => setShowReport(true)}
                    >
                      <ChartColumnBig width={14} height={14} /> Reports
                    </button>
                  </div>
                  <div className={styles.tasks}>
                    <DndProvider backend={HTML5Backend}>
                      {tasks.filter(Boolean).map((task, index) => (
                        <DraggableItem
                          key={task.id}
                          index={index}
                          moveItem={(from, to) => {
                            if (isCountingDown && !isPaused) {
                              handlePause()
                            }
                            setTasks((prevTasks) => {
                              const newTasks = [...prevTasks]
                              newTasks.splice(
                                to,
                                0,
                                newTasks.splice(from, 1)[0],
                              )

                              trackEvent("task_move")

                              return newTasks
                            })
                          }}
                        >
                          <div
                            key={task.id}
                            className={clsx(
                              styles.task,
                              index === 0 && styles.currentTask,
                              task.id === selectedTask?.id &&
                                styles.selectedTask,
                              isCountingDown && !isPaused && styles.counting,
                              isPaused && styles.paused,
                              isFinished && styles.finished,
                            )}
                          >
                            <div className={styles.taskContent}>
                              <div
                                onClick={() => {
                                  if (!isCountingDown && time === 0) {
                                    setSelectedTask(task)
                                    handlePresetTime(25)
                                  }

                                  if (task.id === selectedTask?.id) {
                                    if (!isCountingDown && time > 0) {
                                      trackEvent("task_start")
                                      startCountdown()
                                    } else if (isCountingDown && !isPaused) {
                                      trackEvent("task_pause")
                                      handlePause()
                                    } else if (isPaused) {
                                      trackEvent("task_resume")
                                      handleResume()
                                    }
                                  } else {
                                    trackEvent("task_preset")
                                    setSelectedTask(task)
                                    handlePresetTime(25)
                                  }
                                }}
                                className={styles.taskTitle}
                              >
                                {task.id === selectedTask?.id &&
                                  showControls &&
                                  (isCountingDown ? (
                                    <CirclePause width={14} height={14} />
                                  ) : (
                                    <CirclePlay width={14} height={14} />
                                  ))}
                                {sanitizeHtml(task.title)}
                                {(() => {
                                  const totalTime = task.total?.reduce(
                                    (total, item) => total + item.count,
                                    0,
                                  )

                                  if (totalTime && totalTime > 0) {
                                    return (
                                      <span className={styles.taskTime}>
                                        {Math.floor(totalTime / 3600)}h{" "}
                                        {Math.floor((totalTime % 3600) / 60)}m{" "}
                                        {Math.floor(totalTime % 60)}s
                                      </span>
                                    )
                                  }
                                })()}
                              </div>

                              <GripVertical
                                width={22}
                                height={22}
                                className={styles.dragHandle}
                              />
                              <button
                                className={styles.editButton}
                                onClick={() => {
                                  if (selectedTask?.id === task.id) {
                                    handlePause()
                                  }
                                  setEditingTask(task)
                                }}
                              >
                                <Pencil width={18} height={18} />
                              </button>
                            </div>
                          </div>
                        </DraggableItem>
                      ))}
                    </DndProvider>
                  </div>
                </>
              ) : null}

              <div className={styles.newTask}>
                <button
                  className={styles.newTaskButton}
                  onClick={() => {
                    setAddingTask(true)
                  }}
                >
                  <AlarmClockCheck width={14} height={14} />
                  New task
                </button>
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}
