#!/usr/bin/env bash
# optimize-images.sh — Build-time image optimization for Docusaurus docs portal
#
# Compresses PNG/JPEG/GIF images in static/ to WebP format using sharp-cli.
# Original files are preserved; optimized copies are placed alongside with .webp extension.
#
# Usage:
#   bash scripts/optimize-images.sh          # optimize all images
#   bash scripts/optimize-images.sh --dry-run # preview without writing
#
# Requirements: sharp-cli (installed as devDependency)

set -euo pipefail

STATIC_DIR="$(cd "$(dirname "$0")/../static" && pwd)"
DRY_RUN=false
QUALITY=80
MAX_WIDTH=1200

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN — no files will be written"
fi

if ! command -v sharp &>/dev/null; then
  echo "❌ sharp-cli not found. Install with: npm install --save-dev sharp-cli sharp"
  exit 1
fi

total_original=0
total_optimized=0
count=0

echo "🖼️  Scanning ${STATIC_DIR} for images..."

while IFS= read -r -d '' img; do
  ext="${img##*.}"
  ext_lower="$(echo "$ext" | tr '[:upper:]' '[:lower:]')"
  
  # Skip SVGs (vector format, no rasterization benefit) and already-optimized WebP
  if [[ "$ext_lower" == "svg" || "$ext_lower" == "webp" || "$ext_lower" == "avif" ]]; then
    continue
  fi
  
  original_size=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null)
  webp_target="${img%.*}.webp"
  
  # Skip if WebP already exists and is smaller
  if [[ -f "$webp_target" ]]; then
    existing_size=$(stat -f%z "$webp_target" 2>/dev/null || stat -c%s "$webp_target" 2>/dev/null)
    if [[ "$existing_size" -lt "$original_size" ]]; then
      echo "  ⏭️  $(basename "$img") — WebP already smaller ($(numfmt --to=iec "$existing_size" 2>/dev/null || echo "${existing_size}B"))"
      continue
    fi
  fi
  
  if $DRY_RUN; then
    echo "  📋 Would optimize: $(basename "$img") ($(numfmt --to=iec "$original_size" 2>/dev/null || echo "${original_size}B"))"
  else
    # Convert to WebP with quality and max-width constraints
    sharp -i "$img" -o "$webp_target" \
      --format webp \
      --quality "$QUALITY" \
      --resize "$MAX_WIDTH" \
      --fit inside \
      2>/dev/null || {
        echo "  ⚠️  Failed to optimize: $(basename "$img")"
        continue
      }
    
    if [[ -f "$webp_target" ]]; then
      new_size=$(stat -f%z "$webp_target" 2>/dev/null || stat -c%s "$webp_target" 2>/dev/null)
      if [[ "$new_size" -lt "$original_size" ]]; then
        saved=$((original_size - new_size))
        pct=$((saved * 100 / original_size))
        echo "  ✅ $(basename "$img") → $(basename "$webp_target") — saved ${pct}% ($(numfmt --to=iec "$saved" 2>/dev/null || echo "${saved}B"))"
        total_original=$((total_original + original_size))
        total_optimized=$((total_optimized + new_size))
        count=$((count + 1))
      else
        echo "  ⏭️  $(basename "$img") — WebP not smaller, keeping original"
        rm -f "$webp_target"
      fi
    fi
  fi
done < <(find "$STATIC_DIR" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.gif' \) -print0)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$count" -gt 0 ]]; then
  total_saved=$((total_original - total_optimized))
  echo "📊 Optimized $count images"
  echo "   Original:  $(numfmt --to=iec "$total_original" 2>/dev/null || echo "${total_original}B")"
  echo "   WebP:      $(numfmt --to=iec "$total_optimized" 2>/dev/null || echo "${total_optimized}B")"
  echo "   Saved:     $(numfmt --to=iec "$total_saved" 2>/dev/null || echo "${total_saved}B")"
else
  echo "📊 No images needed optimization"
fi
