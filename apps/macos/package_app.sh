#!/bin/bash

# Create app bundle structure
APP_NAME="FocusButton"
APP_BUNDLE="$APP_NAME.app"
CONTENTS_DIR="$APP_BUNDLE/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

# App version
VERSION="1.3.0"

# Remove existing bundle if it exists
rm -rf "$APP_BUNDLE"

# Create directory structure
mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES_DIR"

# Build Swift app
swift build -c release

# Copy executable
cp .build/release/FocusButton "$MACOS_DIR/"

# Copy icon
cp Sources/FocusButton/Resources/icon-128.png "$RESOURCES_DIR/"

# Create icns from png
mkdir -p icon.iconset
sips -z 16 16 Sources/FocusButton/Resources/icon-512.png --out icon.iconset/icon_16x16.png
sips -z 32 32 Sources/FocusButton/Resources/icon-512.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32 Sources/FocusButton/Resources/icon-512.png --out icon.iconset/icon_32x32.png
sips -z 64 64 Sources/FocusButton/Resources/icon-512.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 Sources/FocusButton/Resources/icon-512.png --out icon.iconset/icon_128x128.png
sips -z 256 256 Sources/FocusButton/Resources/icon-512.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 Sources/FocusButton/Resources/icon-512.png --out icon.iconset/icon_256x256.png
sips -z 512 512 Sources/FocusButton/Resources/icon-512.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 Sources/FocusButton/Resources/icon-512.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 Sources/FocusButton/Resources/icon-512.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o "$RESOURCES_DIR/FocusButton.icns"
rm -rf icon.iconset

# Create Info.plist
cat > "$CONTENTS_DIR/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>FocusButton</string>
    <key>CFBundleIconFile</key>
    <string>FocusButton</string>
    <key>CFBundleIdentifier</key>
    <string>com.focusbutton.app</string>
    <key>CFBundleName</key>
    <string>FocusButton</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF

# Make executable
chmod +x "$MACOS_DIR/FocusButton"

echo "App bundle created at $APP_BUNDLE"

# Create a DMG for distribution
DMG_NAME="$APP_NAME-$VERSION.dmg"
rm -f "$DMG_NAME"
hdiutil create -volname "$APP_NAME" -srcfolder "$APP_BUNDLE" -ov -format UDZO "$DMG_NAME"

echo "DMG created at $DMG_NAME"
