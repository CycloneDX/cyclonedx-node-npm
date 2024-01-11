#!/usr/bin/env node
/* !!! do not remove/rename this file, it is public CLI in replacement for an API !!! */
require('../dist/cli.js').run(process).catch(e => {
  process.stderr.write(`\n${e}\n`)
  return Math.max(1, Math.floor(Number(e?.code)) || 254)
}).then(exitCode => {
  process.exitCode = exitCode
})
