#!/usr/bin/env node
try {
  require('../dist/cli.js').run(process)
} catch (e) {
  process.stderr.write(`ERROR | ${e}`)
  process.exit(e?.code || 1)
}
