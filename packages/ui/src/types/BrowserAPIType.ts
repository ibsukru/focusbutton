// Type definitions for Browser API interactions

export interface MessageSender {
  tab?: {
    id?: number;
    url?: string;
  };
  frameId?: number;
  id?: string;
  url?: string;
}

export interface StorageChange<T = any> {
  oldValue?: T;
  newValue?: T;
}

export interface StorageChanges {
  [key: string]: StorageChange;
}

export interface TabQueryInfo {
  active?: boolean;
  currentWindow?: boolean;
  [key: string]: any;
}

export interface TabUpdateProperties {
  url?: string;
  active?: boolean;
  [key: string]: any;
}

export interface TabCreateProperties {
  url?: string;
  active?: boolean;
  [key: string]: any;
}

export interface WindowUpdateInfo {
  state?: "normal" | "minimized" | "maximized" | "fullscreen";
  [key: string]: any;
}

export interface NotificationOptions {
  type?: "basic" | "image" | "list" | "progress";
  title: string;
  message: string;
  iconUrl?: string;
  body?: string;
  icon?: string;
}

export type TimerMessageType =
  | "START_TIMER"
  | "STOP_TIMER"
  | "PAUSE_TIMER"
  | "RESUME_TIMER"
  | "TIMER_UPDATE";

export interface TimerMessage {
  type: TimerMessageType;
  time?: number;
  isPaused?: boolean;
  isFinished?: boolean;
  running?: boolean;
  remainingTime?: number;
}

export interface BrowserAPIType {
  storage: {
    local: {
      get: <T = any>(
        keys?: string | string[] | { [key: string]: T }
      ) => Promise<{ [key: string]: T }>;
      set: <T = any>(items: { [key: string]: T }) => Promise<void>;
    };
    onChanged: {
      addListener: (callback: (changes: StorageChanges) => void) => void;
      removeListener: (callback: (changes: StorageChanges) => void) => void;
    };
  };
  runtime: {
    id?: string;
    sendMessage: (message: TimerMessage) => Promise<any>;
    onMessage: {
      addListener: (
        callback: (
          message: TimerMessage,
          sender: MessageSender,
          sendResponse: () => void
        ) => void
      ) => void;
      removeListener: (
        callback: (
          message: TimerMessage,
          sender: MessageSender,
          sendResponse: () => void
        ) => void
      ) => void;
    };
  };
  notifications: {
    create: (
      notificationId: string,
      options: NotificationOptions
    ) => Promise<string>;
    onClicked: {
      addListener: (callback: (notificationId: string) => void) => void;
      removeListener: (callback: (notificationId: string) => void) => void;
    };
    clear: (notificationId: string) => Promise<void>;
  };
  tabs: {
    query: (queryInfo: TabQueryInfo) => Promise<any>;
    update: (
      tabId: number,
      updateProperties: TabUpdateProperties
    ) => Promise<any>;
    create: (createProperties: TabCreateProperties) => Promise<any>;
  };
  windows: {
    update: (windowId: number, updateInfo: WindowUpdateInfo) => Promise<any>;
  };
}

export default BrowserAPIType;
