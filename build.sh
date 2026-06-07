#!/usr/bin/env bash
# Compile all JSX sources to minified JS. Run after editing any .jsx file.
set -e
cd "$(dirname "$0")"
for f in tweaks-panel ui widgets apps-widget widgets-live widgets-extras workspace floating-pomo app; do
  npx --yes esbuild@0.24.0 "$f.jsx" --loader:.jsx=jsx --minify --target=es2020 --outfile="$f.js"
done
echo "Built."
