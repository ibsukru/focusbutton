# FocusButton Chrome Extension

A minimalist focus timer extension for Chrome that helps users maintain productivity through focused work sessions.

## Features

- Simple, distraction-free interface
- Customizable focus session durations
- Audio notifications for session completion
- Dark mode support
- Local storage for settings
- Cross-device synchronization

## API Usage Justifications

### 1. Offscreen API

Used exclusively for audio playback to notify users when focus sessions end.

**Justification:**

- Essential for user awareness when working in other tabs/applications
- Crucial for accessibility (users with visual impairments)
- Prevents users from unknowingly exceeding focus duration
- Minimal resource usage (created only when needed)
- Properly cleaned up after use
- No sensitive data processing
- Audio files bundled with extension

**Implementation:**

```javascript
chrome.offscreen.createDocument({
  url: "offscreen.html",
  reasons: ["AUDIO_PLAYBACK"],
  justification: "Playing timer completion sound",
});
```

### 2. Storage API

Used for storing timer state and user preferences.

**Justification:**

- Essential for maintaining timer state across sessions
- Required for syncing preferences across devices
- Stores only necessary data locally
- No sensitive information stored
- Implements proper data cleanup

### 3. Alarms API

Used for accurate timer functionality.

**Justification:**

- Required for reliable timer operation
- More efficient than setInterval/setTimeout
- Handles background operation correctly
- Minimal system resource usage
- Essential for core extension functionality

### 4. Notifications API

Used for timer completion alerts.

**Justification:**

- Essential for user awareness
- Respects system notification settings
- Used only for important timer events
- Enhances accessibility
- No marketing or promotional content

### 5. Tabs API

Used for managing timer state across browser tabs and windows.

**Justification:**

- Essential for synchronizing timer state across multiple tabs
- Required for consistent timer display in all extension instances
- Needed for proper background worker communication
- Used to maintain accurate timer state when switching tabs
- No access to tab content or browsing history
- Only used for extension's own UI updates
- Ensures seamless user experience across browser sessions

### 6. ActiveTab Permission

Used for accessing the current tab when the user interacts with the extension.

**Justification:**

- More secure than broad host permissions
- Only activates when user explicitly interacts with extension
- Provides temporary access to the current tab
- Access limited to active tab only
- No persistent content access
- Follows Chrome's recommended security practices
- Better user privacy protection

### 7. Scripting Permission

Used for dynamically injecting content scripts when user interacts with the extension.

**Justification:**

- Works in conjunction with activeTab permission
- Required for dynamic content script injection
- Only activates on user interaction
- More secure than static content scripts
- Provides better control over script execution
- Follows Chrome's recommended security practices
- Enables on-demand functionality

## Security and Privacy

### Data Collection

- Only collects necessary timer settings and preferences
- No personal information collected
- All data stored locally
- Optional analytics for improving user experience

### Data Storage

- Uses Chrome's secure storage API
- No external servers used
- Data encrypted by Chrome
- Regular cleanup of unused data

### Permissions

All requested permissions are essential for core functionality:

- Storage: For saving timer settings
- Notifications: For timer completion alerts
- Audio: For completion sound
- Background: For timer accuracy
- Tabs: For syncing timer state across browser tabs and windows (no content access)
- ActiveTab: For displaying timer UI in response to user interaction (temporary access)
- Scripting: For dynamically injecting timer UI code when needed (user-activated)

## Testing and Validation

### Automated Testing

- Unit tests for core functionality
- Integration tests for API usage
- Performance monitoring
- Memory leak detection

### Manual Testing

- Cross-platform verification
- Different Chrome versions
- Various user scenarios
- Edge case handling

## Compliance

### Chrome Web Store Policies

- Follows all content policies
- Clear privacy policy
- Transparent functionality
- No hidden features

### Best Practices

- Efficient resource usage
- Proper error handling
- Regular updates and maintenance
- Responsive support

## Support and Updates

### Maintenance

- Regular security updates
- Performance optimizations
- Bug fixes
- Feature enhancements

### User Support

- GitHub issues tracking
- Email support: ibsukru@gmail.com
- Documentation updates
- User feedback integration

## Development

### Building

```bash
npm install
npm run build
```

### Testing

```bash
npm test
```

## License

MIT License - see LICENSE file for details
