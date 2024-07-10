#!/bin/sh
set -ex

## purpose: generate example results from the demos

THIS_DIR="$(dirname "$0")"
BIN_CDX_N="$(realpath "$THIS_DIR/../bin/cyclonedx-npm-cli.js")"
export npm_execpath="${npm_execpath:-$(which npm)}"

for package in "$THIS_DIR"/*/project/package.json
do
  echo ">>> $package"
  project="$(dirname "$package")"
  result_dir="$(dirname "$project")/example-results"

  rm -rf "$result_dir"
  mkdir -p "$result_dir"
  "$npm_execpath" --prefix "$project" install --ignore-scripts

  for format in 'json' 'xml'
  do
    for spec in '1.6' '1.5' '1.4' '1.3' '1.2'
    do
      echo ">>> $result_dir $spec $format bare"
      mkdir -p "$result_dir/bare"
      node -- "$BIN_CDX_N" \
        --spec-version "$spec" \
        --output-reproducible \
        --validate \
        --output-format "$format" \
        --output-file "$result_dir/bare/bom.$spec.$format" \
        "$package"

      echo ">>> $result_dir $spec $format flat"
      mkdir -p "$result_dir/flat"
      node -- "$BIN_CDX_N" \
        --flatten-components \
        --spec-version "$spec" \
        --output-reproducible \
        --validate \
        --output-format "$format" \
        --output-file "$result_dir/flat/bom.$spec.$format" \
        "$package"
    done
  done
done
