import Cocoa
import WebKit

class WindowController: NSWindowController {
    convenience init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 400, height: 600),
            styleMask: [.titled, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "FocusButton"
        window.center()
        self.init(window: window)
    }
}

class PopoverViewController: NSViewController {
    private var webView: WKWebView!
    
    override func loadView() {
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "focusApp")
        webView = WKWebView(frame: .zero, configuration: config)
        view = webView
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Load Next.js development server
        if let url = URL(string: "http://localhost:3006") {
            let request = URLRequest(url: url)
            webView.load(request)
        }
        
        // Set size for the popover
        preferredContentSize = NSSize(width: 400, height: 600)
    }
}

extension PopoverViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let dict = message.body as? [String: Any],
              let type = dict["type"] as? String else { return }
        
        switch type {
        case "toggleFocusMode":
            (NSApplication.shared.delegate as? AppDelegate)?.statusBarController.toggleFocusMode()
        case "quit":
            NSApplication.shared.terminate(nil)
        case "updateTimer":
            guard let time = dict["time"] as? Int else { return }
            (NSApplication.shared.delegate as? AppDelegate)?.statusBarController.updateTimer(time: time)
        case "clearTimer":
            (NSApplication.shared.delegate as? AppDelegate)?.statusBarController.clearTimer()
        case "playSound":
            (NSApplication.shared.delegate as? AppDelegate)?.statusBarController.playSound()
        default:
            break
        }
    }
}

class StatusBarController {
    private var statusItem: NSStatusItem!
    private var popover: NSPopover!
    private var focusModeOn = false
    private let defaults = UserDefaults.standard
    private var statusBarIcon: NSImage?
    private var notificationSound: NSSound?
    private var lastUpdateTime: TimeInterval = 0
    private let itemWidth: CGFloat = 65 // Reduced width for menu bar item
    
    init() {
        setupStatusItem()
        setupPopover()
        notificationSound = NSSound(named: "Ping")
        updateTimer(time: 0) // Set initial display to 00:00
    }
    
    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: itemWidth)
        focusModeOn = defaults.bool(forKey: "focusModeEnabled")
        
        // Load custom icon
        if let iconURL = Bundle.module.url(forResource: "icon-128", withExtension: "png"),
           let image = NSImage(contentsOf: iconURL) {
            image.size = NSSize(width: 16, height: 16) // Slightly smaller icon
            statusBarIcon = image
        }
        
        if let button = statusItem.button {
            button.image = statusBarIcon ?? NSImage(systemSymbolName: focusModeOn ? "moon.fill" : "moon", accessibilityDescription: "Focus Mode")
            button.imagePosition = .imageLeft
            button.target = self
            button.action = #selector(togglePopover)
            
            // Set fixed width for the button
            button.frame.size.width = itemWidth
        }
    }
    
    private func setupPopover() {
        popover = NSPopover()
        popover.contentViewController = PopoverViewController()
        popover.behavior = .transient
    }
    
    @objc func togglePopover() {
        if let button = statusItem.button {
            if popover.isShown {
                popover.performClose(nil)
            } else {
                popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
                NSApp.activate(ignoringOtherApps: true)
            }
        }
    }
    
    @objc func toggleFocusMode() {
        focusModeOn.toggle()
        defaults.set(focusModeOn, forKey: "focusModeEnabled")
        
        if let button = statusItem.button {
            button.image = statusBarIcon ?? NSImage(systemSymbolName: focusModeOn ? "moon.fill" : "moon", accessibilityDescription: "Focus Mode")
        }
        
        if focusModeOn {
            enableFocusMode()
        } else {
            disableFocusMode()
        }
    }
    
    private func enableFocusMode() {
        let task = Process()
        task.launchPath = "/usr/bin/defaults"
        task.arguments = ["-currentHost", "write", "~/Library/Preferences/ByHost/com.apple.notificationcenterui", "doNotDisturb", "1"]
        try? task.run()
    }
    
    private func disableFocusMode() {
        let task = Process()
        task.launchPath = "/usr/bin/defaults"
        task.arguments = ["-currentHost", "write", "~/Library/Preferences/ByHost/com.apple.notificationcenterui", "doNotDisturb", "0"]
        try? task.run()
    }
    
    func updateTimer(time: Int) {
        let currentTime = Date().timeIntervalSince1970
        
        // Only update if more than 0.2 seconds have passed since last update
        // This prevents too frequent updates while still maintaining smoothness
        if currentTime - lastUpdateTime >= 0.2 {
            DispatchQueue.main.async {
                let minutes = time / 60
                let seconds = time % 60
                let timeString = String(format: "%02d:%02d", minutes, seconds)
                
                if let button = self.statusItem.button {
                    button.title = timeString
                    button.image = self.statusBarIcon
                    button.imagePosition = .imageLeft
                    button.frame.size.width = self.itemWidth // Maintain fixed width
                }
            }
            lastUpdateTime = currentTime
        }
    }
    
    func clearTimer() {
        updateTimer(time: 0) // Show 00:00 instead of clearing the text
    }
    
    func playSound() {
        NSSound.beep()
        notificationSound?.play()
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()

class AppDelegate: NSObject, NSApplicationDelegate {
    var statusBarController: StatusBarController!
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        statusBarController = StatusBarController()
        
        // Start Next.js development server
        let task = Process()
        task.launchPath = "/usr/bin/env"
        task.arguments = ["npm", "run", "dev"]
        task.currentDirectoryPath = FileManager.default.currentDirectoryPath
        try? task.run()
        
        // Create the main menu
        let mainMenu = NSMenu()
        
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)
        
        let appMenu = NSMenu()
        appMenuItem.submenu = appMenu
        
        let quitMenuItem = NSMenuItem(
            title: "Quit FocusButton",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        )
        appMenu.addItem(quitMenuItem)
        
        NSApp.mainMenu = mainMenu
    }
    
    func applicationWillTerminate(_ notification: Notification) {
        if UserDefaults.standard.bool(forKey: "focusModeEnabled") {
            statusBarController.toggleFocusMode()
        }
    }
}
