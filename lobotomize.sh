#!/bin/bash

# Determine the OS and set the application data directory path
OS="$(uname -s)"
APP_DIR_NAME="personal-journal-cli"
APP_DIR=""

case "$OS" in
    Linux*)
        APP_DIR="$HOME/.config/$APP_DIR_NAME"
        ;;
    Darwin*)
        APP_DIR="$HOME/Library/Application Support/$APP_DIR_NAME"
        ;;
    *)
        echo "Unsupported operating system: $OS"
        exit 1
        ;;
esac

echo "This script will completely reset the application by deleting the following directory:"
echo "  $APP_DIR"
echo ""
echo "This action is irreversible."

# Check if the directory exists before proceeding
if [ ! -d "$APP_DIR" ]; then
    echo "Application data directory not found. Nothing to do."
    exit 0
fi

# Ask for confirmation
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo # Move to a new line

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deleting application data directory..."
    rm -rf "$APP_DIR"
    if [ $? -eq 0 ]; then
        echo "Reset complete. Please restart the application."
    else
        echo "An error occurred during deletion."
    fi
else
    echo "Reset cancelled."
fi