#!/usr/bin/env sh
set -eu

out="MGTools.user.js"
tmp="${out}.tmp"

rm -f "$tmp"

for part in \
  src/00-userscript-meta.js \
  src/01-room-connection-prelude.js \
  src/02-module-structure.js \
  src/03-module-01-initialization.js \
  src/04-module-02-compatibility.js \
  src/05-module-03-storage.js \
  src/06-module-04-configuration.js \
  src/07-module-05-logging.js \
  src/08-module-06-compatibility-extended.js \
  src/09-module-07-network.js \
  src/10-module-08-ui-assets.js \
  src/11-module-09-state.js \
  src/12-module-10-ui-main.js \
  src/13-module-11-events.js \
  src/14-module-12-main-bootstrap.js \
  src/15-module-13-public-api.js \
  src/16-mgtp-overlay.js \
  src/17-ability-log-hard-clear-merge-block.js
do
  if [ ! -f "$part" ]; then
    echo "Missing source part: $part" >&2
    rm -f "$tmp"
    exit 1
  fi
  cat "$part" >> "$tmp"
done

mv "$tmp" "$out"
echo "Built $out from src/*.js"
