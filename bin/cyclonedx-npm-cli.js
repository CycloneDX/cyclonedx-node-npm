#!/usr/bin/env node
try {
  require('../dist/cli.js').run(process)
} catch (e) {
  process.stderr.write(`\n${e}\n`)
  process.exit(Math.floor(Number(e?.code)) || 1)
}
