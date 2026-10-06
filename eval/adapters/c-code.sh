#!/usr/bin/env bash
# Approach C adapter: python eval/run.py --adapter eval/adapters/c-code.sh
here="$(cd "$(dirname "$0")/../.." && pwd)"
exec "$here/frontend/node_modules/.bin/tsx" --tsconfig "$here/frontend/tsconfig.harness.json" "$here/eval/adapters/c-code.ts"
