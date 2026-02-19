#!/usr/bin/env bash
# Accuracy test: compare scan output against ground truth
# Usage: ./scripts/accuracy-test.sh [ground-truth.json] [port]
#
# Requires: jq, curl, base64, python3
# Default: scripts/ground-truth/vietnam1.json on port 3001

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GROUND_TRUTH="${1:-$SCRIPT_DIR/ground-truth/vietnam1.json}"
PORT="${2:-3001}"
BASE_URL="http://localhost:$PORT"

for cmd in jq python3 curl; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is required"; exit 1
  fi
done

if [ ! -f "$GROUND_TRUTH" ]; then
  echo "ERROR: Ground truth file not found: $GROUND_TRUTH"; exit 1
fi

MENU_IMAGE=$(jq -r '.menuImage' "$GROUND_TRUTH")
if [ ! -f "$MENU_IMAGE" ]; then
  echo "ERROR: Menu image not found: $MENU_IMAGE"; exit 1
fi

EXPECTED_COUNT=$(jq -r '.expectedDishCount' "$GROUND_TRUTH")

echo "=== Plate Expectations Accuracy Test ==="
echo "Ground truth: $GROUND_TRUTH"
echo "Menu image:   $MENU_IMAGE"
echo "Expected:     $EXPECTED_COUNT dishes"
echo "Server:       $BASE_URL"
echo ""

# Encode image
echo "Encoding image..."
BASE64="data:image/png;base64,$(base64 -i "$MENU_IMAGE" | tr -d '\n')"

# Call scan API
echo "Calling /api/scan..."
SCAN_OUTPUT=$(mktemp)
curl -sN -X POST "$BASE_URL/api/scan" \
  -H 'Content-Type: application/json' \
  -d "{\"image\":\"$BASE64\"}" \
  > "$SCAN_OUTPUT" 2>/dev/null

# Parse NDJSON — collect all dishes from batch events
DISHES=$(mktemp)
grep '"type":"batch"' "$SCAN_OUTPUT" | jq -s '[.[].dishes[]]' > "$DISHES" 2>/dev/null || echo "[]" > "$DISHES"

ACTUAL_COUNT=$(jq 'length' "$DISHES")
echo "Scan returned: $ACTUAL_COUNT dishes"
echo ""

# Use Python for unicode-safe comparison
PYSCRIPT=$(mktemp /tmp/accuracy_XXXXXX.py)
cat > "$PYSCRIPT" << 'PYEOF'
import json, sys, re, unicodedata, urllib.parse, subprocess

def normalize(s):
    """Lowercase, collapse whitespace, strip."""
    return re.sub(r'\s+', ' ', s.lower().strip())

def strip_tones(s):
    """Remove diacritics for fuzzy matching."""
    nfkd = unicodedata.normalize('NFD', s)
    return ''.join(c for c in nfkd if not unicodedata.combining(c)).replace('đ','d').replace('Đ','D')

def fuzzy_match(a, b):
    """Check if names match after tone stripping."""
    return strip_tones(normalize(a)) == strip_tones(normalize(b))

def price_match(got, expected):
    """Compare prices: handle number vs string, strip currency."""
    got_n = re.search(r'[\d.]+', str(got))
    exp_n = re.search(r'[\d.]+', str(expected))
    if not got_n or not exp_n: return False
    return float(got_n.group()) == float(exp_n.group())

gt_file, dishes_file = sys.argv[1], sys.argv[2]
gt = json.load(open(gt_file))
dishes = json.load(open(dishes_file))

name_correct = 0
name_fuzzy = 0
price_correct = 0
total = len(gt['dishes'])

print("--- Name Comparison ---")
for exp in gt['dishes']:
    exp_local = exp['nameLocal']
    exp_english = exp['nameEnglish']
    exp_price = exp['price']

    # Find match: try corrected name, then nameLocal, then English
    match = None
    for d in dishes:
        corrected = d.get('nameLocalCorrected', '')
        local = d.get('nameLocal', '')
        eng = d.get('nameEnglish', '')
        if normalize(corrected) == normalize(exp_local) or normalize(local) == normalize(exp_local):
            match = d; break
        if fuzzy_match(corrected, exp_local) or fuzzy_match(local, exp_local):
            match = d; break
    if not match:
        # Try English containment
        for d in dishes:
            eng = normalize(d.get('nameEnglish', ''))
            exp_eng = normalize(exp_english)
            if exp_eng in eng or eng in exp_eng:
                match = d; break

    if not match:
        print(f"  ✗ {exp_local} ({exp_english}) — NOT FOUND")
        continue

    best = match.get('nameLocalCorrected') or match.get('nameLocal', '')
    got_eng = match.get('nameEnglish', '')
    got_price = match.get('price', '')

    if normalize(best) == normalize(exp_local):
        name_correct += 1
        print(f"  ✓ {exp_local} — got: {best}")
    elif fuzzy_match(best, exp_local):
        name_fuzzy += 1
        print(f"  ~ {exp_local} — got: {best} (tone diff)")
    else:
        print(f"  ✗ {exp_local} — got: {best}")

    if price_match(got_price, exp_price):
        price_correct += 1

print()
print("--- Image Check (using imageSearchQuery from scan) ---")
real = 0; dalle = 0; none = 0

for d in dishes:
    q = d.get('imageSearchQuery') or d.get('nameLocalCorrected') or d.get('nameLocal') or d.get('nameEnglish', '')
    name = d.get('nameEnglish', '')
    desc = d.get('description', '')
    params = urllib.parse.urlencode({'q': q, 'fallback': d.get('imageSearchQuery', name), 'dishName': name, 'description': desc})
    url = f"http://localhost:{sys.argv[3]}/api/dish-image?{params}"
    try:
        result = subprocess.run(['curl', '-s', url], capture_output=True, text=True, timeout=30)
        data = json.loads(result.stdout)
        img_url = data.get('imageUrl')
        generated = data.get('generated', [])
        if not img_url:
            none += 1; print(f"  ✗ {name} — no image")
        elif generated and generated[0]:
            dalle += 1; print(f"  ~ {name} — DALL-E generated")
        else:
            real += 1; print(f"  ✓ {name} — real photo")
    except Exception as e:
        none += 1; print(f"  ✗ {name} — error: {e}")

print()
print("=== SCORECARD ===")
print(f"Names:  {name_correct}/{total} exact, {name_fuzzy}/{total} fuzzy (tone diff)")
print(f"Prices: {price_correct}/{total} correct")
print(f"Images: {real} real, {dalle} DALL-E, {none} missing")
print(f"Dishes: {len(dishes)} returned (expected {gt['expectedDishCount']})")
PYEOF

python3 "$PYSCRIPT" "$GROUND_TRUTH" "$DISHES" "$PORT"

# Cleanup
rm -f "$SCAN_OUTPUT" "$DISHES" "$PYSCRIPT"
