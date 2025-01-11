# Changelog

All notable changes to this project will be documented in this file.

## [1.3.1] - 2025-01-11

### Added
- Customizable timer presets with persistent storage
- Settings panel for managing timer presets
- Improved theme toggle button positioning
- Enhanced UI responsiveness

### Changed
- Moved theme toggle to bottom of timer
- Updated Google Analytics implementation using @next/third-parties
- Simplified footer component structure
- Improved macOS app icon resolution

## [1.3.0] - 2025-01-10

### Added

- Released native macOS application
- Menu bar integration for quick access
- Local timer management
- DMG installer for easy installation
- Native window management

### Changed

- Improved UI responsiveness in native app
- Enhanced focus mode integration with system
- Optimized performance for macOS

## [1.2.1] - 2025-01-05

### Fixed

- Fixed form submission issues in task management
- Added proper button types to prevent unwanted form submissions
- Improved form handling and state management

## [1.2.0] - 2025-01-04

### Added

- Task management system with drag-and-drop reordering
- Task completion tracking with time statistics
- Visual reports showing task completion trends
- Task persistence using local storage
- Task editing and deletion with confirmation
- Sanitized task input for security
- Auto-focus on task input fields
- Improved button hover states and animations

### Changed

- Enhanced UI layout for better task management
- Optimized chart display for better readability
- Improved task state management and persistence
- Updated all dependencies to latest versions

## [1.1.1] - 2024-12-31

### Fixed

- Fixed notification errors on Android web browsers by disabling notifications on Android devices
- Added proper error handling for notifications and permissions
- Improved cross-platform compatibility for timer end notifications

## [1.1.0] - 2024-12-26

### Added

- Added Pomodoro preset buttons (25min, 5min, 15min)
- Added persistent timer state across page refreshes

### Changed

- Improved timer state management for better reliability
- Enhanced UI layout with better spacing and animations
- Optimized button interactions for better user experience

### Fixed

- Fixed timer state persistence in Firefox extension
- Fixed controls visibility after page refresh
- Fixed theme toggle button keyboard accessibility

## [1.0.3] - 2024-01-22

### Fixed

- Fixed timer adjustment not working on first click in extension
- Fixed timer increment/decrement issues during press and hold
- Improved timer state synchronization between UI and storage
- Fixed race conditions in timer adjustment logic

### Changed

- Optimized timer adjustment mechanism for better responsiveness
- Improved state management during timer adjustments
- Enhanced storage update logic for more reliable synchronization

## [1.0.2] - 2024-01-21

### Fixed

- Improved button focus states across web and extension interfaces
- Standardized focus outline styling using accent colors
- Enhanced accessibility with better visual focus indicators
- Removed redundant border styles in favor of cleaner outline approach

### Build

- Added automatic ZIP file creation for extension builds
- Added separate ZIP creation for Chrome and Firefox distributions
- Added new build scripts for streamlined release process
- Build process improvements for both Chrome and Firefox versions

### Documentation

- Improved documentation formatting and readability
- Updated installation instructions to use npm
- Standardized npm commands across all documentation

### Internal

- Aligned version numbers across all packages (Extension, Web App, UI Package)
- Streamlined CSS variables usage
- Focus outline now uses `var(--accent-4)` for consistent styling
- Simplified CSS selectors for focus states

## [1.0.1] - 2024-01-21

### Added

- Automatic ZIP file creation for extension builds
- Separate ZIP creation for Chrome and Firefox distributions
- New build scripts for streamlined release process

### Changed

- Improved button focus states across web and extension interfaces
- Standardized focus outline styling using accent colors
- Enhanced accessibility with better visual focus indicators
- Removed redundant border styles in favor of cleaner outline approach
- Aligned version numbers across all packages (Extension, Web App, UI Package)
- Improved documentation formatting and readability
- Updated installation instructions to use npm
- Standardized npm commands across all documentation

### Technical

- Extension manifest version updated to 1.0.1
- Build process improvements for both Chrome and Firefox versions
- Streamlined CSS variables usage
- Focus outline now uses `var(--accent-4)` for consistent styling
- Simplified CSS selectors for focus states

### Package-Specific Changes

#### Extension (@focusbutton/extension)

- Added `zip` and `zip:firefox` scripts for distribution
- Updated manifest version to 1.0.1
- Improved focus styles in extension UI

#### Web App (web)

- Version bump to 1.0.1
- Enhanced button focus states
- Standardized outline styling

#### UI Package (@focusbutton/ui)

- Version bump to 1.0.1
- Synchronized with main package versions

## [1.0.0] - Initial Release

- Initial release of FocusButton
- Core timer functionality
- Cross-browser support (Chrome and Firefox)
- Web app interface
- Shared UI components
