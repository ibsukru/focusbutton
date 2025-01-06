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
    
    init() {
        setupStatusItem()
        setupPopover()
    }
    
    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        focusModeOn = defaults.bool(forKey: "focusModeEnabled")
        
        // Load custom icon
        if let iconURL = Bundle.module.url(forResource: "icon-128", withExtension: "png"),
           let image = NSImage(contentsOf: iconURL) {
            image.size = NSSize(width: 18, height: 18) // Resize for menu bar
            statusBarIcon = image
        }
        
        if let button = statusItem.button {
            button.image = statusBarIcon ?? NSImage(systemSymbolName: focusModeOn ? "moon.fill" : "moon", accessibilityDescription: "Focus Mode")
            button.target = self
            button.action = #selector(togglePopover)
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
