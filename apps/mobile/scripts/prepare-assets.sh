#!/bin/bash

# Create assets directory if it doesn't exist
mkdir -p assets

# Copy web assets
cp ../web/public/icon.png assets/
cp ../web/public/logo.png assets/
cp ../web/public/timer_end.mp3 assets/

# Create different sized icons
convert assets/icon.png -resize 1024x1024 assets/icon.png
convert assets/icon.png -resize 512x512 assets/notification-icon.png
convert assets/icon.png -resize 192x192 assets/favicon.png
convert assets/icon.png -resize 512x512 assets/adaptive-icon.png

# Create splash screen
convert assets/logo.png -resize 1242x2436 -background white -gravity center -extent 1242x2436 assets/splash.png
