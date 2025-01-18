import type { Runtime, Browser } from "webextension-polyfill"
import browser from "webextension-polyfill"

const isFirefox = navigator.userAgent.includes("Firefox")

// Ensure browser API is properly initialized
const getBrowserAPI = (): typeof browser => {
  if (typeof browser !== "undefined") {
    return browser
  }
  if (typeof chrome !== "undefined") {
    return chrome as unknown as typeof browser
  }
  throw new Error("No browser API found")
}

const browserInstance = getBrowserAPI()

export type BrowserAPIType = {
  runtime: typeof browserInstance.runtime
  storage: typeof browserInstance.storage
  tabs: typeof browserInstance.tabs
  notifications: typeof browserInstance.notifications
  windows: typeof browserInstance.windows
  scripting: typeof browserInstance.scripting
  getURL: (path: string) => string
  sendMessage: <M, R = any>(
    message: M,
    options?: Runtime.SendMessageOptionsType,
  ) => Promise<R | undefined>
  injectContentScript: (tabId: number) => Promise<any>
  getStorageData: (key: string) => Promise<any>
  setStorageData: (key: string, value: any) => Promise<void>
}

export const browserAPI: BrowserAPIType = {
  runtime: browserInstance.runtime,
  storage: browserInstance.storage,
  tabs: browserInstance.tabs,
  notifications: browserInstance.notifications,
  windows: browserInstance.windows,
  scripting: browserInstance.scripting,

  getURL: browserInstance.runtime.getURL,

  async injectContentScript(tabId: number) {
    const api = getBrowserAPI()
    if (isFirefox) {
      return api.scripting.executeScript({
        target: { tabId },
        files: ["content-script.js"],
      })
    } else {
      return api.scripting.executeScript({
        target: { tabId },
        files: ["content-script.js"],
      })
    }
  },

  async sendMessage<M, R = any>(
    message: M,
    options?: Runtime.SendMessageOptionsType,
  ): Promise<R | undefined> {
    const api = browserInstance
    try {
      return await api.runtime.sendMessage(message, options)
    } catch (error) {
      console.error("Error sending message:", error)
      return undefined
    }
  },

  async getStorageData(key: string) {
    const api = getBrowserAPI()
    const result = await api.storage.local.get(key)
    return result[key]
  },

  async setStorageData(key: string, value: any) {
    const api = getBrowserAPI()
    return api.storage.local.set({ [key]: value })
  },
}
