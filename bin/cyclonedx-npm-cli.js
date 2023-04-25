#!/usr/bin/env node
require('../dist/cli.js').run(process).catch(e => {
  process.stderr.write(`\n${e}\n`)
  return Math.max(1, Math.floor(Number(e?.code)) || 254)
}).then(exitCode => {
  process.exitCode = exitCode
})
