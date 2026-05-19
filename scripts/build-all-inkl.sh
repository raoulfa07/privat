#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist/all-inkl"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

cp -R "$ROOT_DIR/public/." "$DIST_DIR/"
cp -R "$ROOT_DIR/all-inkl/." "$DIST_DIR/"

rm -rf "$DIST_DIR/uploads"
mkdir -p "$DIST_DIR/uploads"
touch "$DIST_DIR/uploads/.gitkeep"

echo "ALL-INKL Paket gebaut: $DIST_DIR"
echo "Wichtig: private/config.example.php auf dem Server zu private/config.php kopieren und ausfuellen."
