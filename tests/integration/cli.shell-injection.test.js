'use strict'

const { existsSync } = require('node:fs')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')

const { describe, expect, test } = require('@jest/globals')

const {
  NPM_LOWEST_SUPPORTED,
  cliWrapperPath,
  dummyProjectsRoot,
  mkTemp
} = require('./')

describe('integration.cli.shell-injection', () => {
  const cliRunTestTimeout = 15_000

  const tmpRoot = mkTemp('cli.shell_injection')


  const sentinelFile = join(tmpRoot, 'shell_injection_proof.txt')


  const payload = `; touch ${JSON.stringify(sentinelFile)} ;`

  describe('--workspace shell injection', () => {
    test.each([
      [
        'single --workspace with shell metacharacters',
        ['--workspace', payload]
      ],
      [
        'chained --workspace: legitimate then malicious',
        ['--workspace', 'legitimate-workspace', '--workspace', payload]
      ]
    ])('%s', (_, cdxArgs) => {
      spawnSync(
        process.execPath,
        ['--', cliWrapperPath, ...cdxArgs],
        {
          cwd: join(dummyProjectsRoot, 'with-lockfile'),
          encoding: 'utf8',
          stdio: 'ignore',
          env: {
            PATH: process.env.PATH,
            HOME: process.env.HOME,
            CT_VERSION: NPM_LOWEST_SUPPORTED.join('.'),
            npm_execpath: undefined
          }
        }
      )

      expect(existsSync(sentinelFile)).toBe(false)
    }, cliRunTestTimeout)
  })
})
