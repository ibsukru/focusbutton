# Changelog

All notable changes to this project will be documented in this file.

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
