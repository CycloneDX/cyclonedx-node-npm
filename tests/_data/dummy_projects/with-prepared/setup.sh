#!/usr/bin/env sh

THIS_DIR="$(realpath "$(dirname $0)" )"
NODE_MODULES_DIR="$THIS_DIR/node_modules"

rm -rf "$NODE_MODULES_DIR"

npm --prefix="$THIS_DIR" install --ignore-scripts

rm -rf "$NODE_MODULES_DIR/.bin"
rm -rf "$NODE_MODULES_DIR/**/.bin"

find "$NODE_MODULES_DIR" \
  \( -type f -or -type l \) \
  -not \( \
    -name 'package.json' -or -name '.package-lock.json' \
    -or -iname '*license*' -or  -iname '*licence*' \
    -or -name 'NOTICE' \
  \) \
  -delete

find "$NODE_MODULES_DIR" \
  \( -iname '*.map' \
  -or -iname '*.ts'  -or -iname '*.js' \
  -or -iname '*.cts' -or -iname '*.cjs' \
  -or -iname '*.mts' -or -iname '*.mjs' \
  \) -delete


