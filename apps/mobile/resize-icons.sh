#!/bin/bash

# Create iOS notification icon (24x24)
convert assets/images/icon.png -resize 24x24 assets/images/notification-24.png

# Create Android notification icon (48x48)
convert assets/images/icon.png -resize 48x48 assets/images/notification-48.png
