#!/usr/bin/env pwsh
$ret=0

$node="node"
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  $node="$node.exe"
}

$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent
$script="$basedir/npm-ls_replacement.js"

if ($MyInvocation.ExpectingInput) {
  $input | & "$node" "$script" $args
} else {
  & "$node" "$script" $args
}
$ret=$LASTEXITCODE
exit $ret
