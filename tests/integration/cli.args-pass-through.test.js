/*!
This file is part of CycloneDX generator for NPM projects.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

SPDX-License-Identifier: Apache-2.0
Copyright (c) OWASP Foundation. All Rights Reserved.
*/

const { existsSync, mkdirSync, readFileSync } = require('node:fs')
const { join } = require('node:path')

const { describe, expect, test } = require('@jest/globals')

const { dummyProjectsRoot, mkTemp, npmLsReplacement, runCLI, NPM_LATETS } = require('./')

describe('integration.cli.args-pass-through', () => {
  const cliRunTestTimeout = 15000

  const tmpRoot = mkTemp('cli.args-pass-through')

  describe('npm-version depending npm-args', () => {
    const tmpRootRun = join(tmpRoot, 'npmVersion-depending-npmArgs')
    mkdirSync(tmpRootRun)

    const rMinor = Math.round(99 * Math.random())
    const rPatch = Math.round(99 * Math.random())

    const npmArgsGeneral = ['--json', '--long']
    const npm9ArgsGeneral = [...npmArgsGeneral, '--all']
    const npm10ArgsGeneral = [...npmArgsGeneral, '--all']
    const npm11ArgsGeneral = [...npmArgsGeneral, '--all']

    test.each([
      // region basic
      ['basic npm 9', `9.${rMinor}.${rPatch}`, [], npm9ArgsGeneral],
      ['basic npm 10', `10.${rMinor}.${rPatch}`, [], npm10ArgsGeneral],
      ['basic npm 11', `11.${rMinor}.${rPatch}`, [], npm11ArgsGeneral],
      // endregion basic
      // region omit
      ['omit everything npm 9', `9.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm9ArgsGeneral, '--omit=dev', '--omit=optional', '--omit=peer']],
      ['omit everything npm 10', `10.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm10ArgsGeneral, '--omit=dev', '--omit=optional', '--omit=peer']],
      ['omit everything npm 11', `11.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm11ArgsGeneral, '--omit=dev', '--omit=optional', '--omit=peer']],
      // endregion omit
      // region package-lock-only
      ['package-lock-only npm 9', `9.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm9ArgsGeneral, '--package-lock-only']],
      ['package-lock-only npm 10', `10.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm10ArgsGeneral, '--package-lock-only']],
      ['package-lock-only npm 11', `11.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm11ArgsGeneral, '--package-lock-only']],
      // endregion package-lock-only
      // region workspace
      ['workspace npm 9', `9.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB'], [...npm9ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB']],
      ['workspace npm 10', `10.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB'], [...npm10ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB']],
      ['workspace npm 11', `11.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB'], [...npm11ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB']],
      // endregion workspace
      // region include-workspace-root
      ['workspace root npm 9', `9.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB', '--include-workspace-root'], [...npm9ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB', '--include-workspace-root=true']],
      ['workspace root npm 10', `10.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB', '--include-workspace-root'], [...npm10ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB', '--include-workspace-root=true']],
      ['workspace root npm 11', `11.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB', '--include-workspace-root'], [...npm11ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB', '--include-workspace-root=true']],
      // endregion include-workspace-root
      // region no-include-workspace-root
      ['no workspace root npm 9', `9.${rMinor}.${rPatch}`, ['--no-include-workspace-root'], [...npm9ArgsGeneral, '--include-workspace-root=false']],
      ['no workspace root npm 10', `10.${rMinor}.${rPatch}`, ['--no-include-workspace-root'], [...npm10ArgsGeneral, '--include-workspace-root=false']],
      ['no workspace root npm 11', `11.${rMinor}.${rPatch}`, ['--no-include-workspace-root'], [...npm11ArgsGeneral, '--include-workspace-root=false']],
      // endregion no-include-workspace-root
      // region no-workspaces
      ['workspaces npm 9', `9.${rMinor}.${rPatch}`, ['--no-workspaces'], [...npm9ArgsGeneral, '--workspaces=false']],
      ['workspaces npm 10', `10.${rMinor}.${rPatch}`, ['--no-workspaces'], [...npm10ArgsGeneral, '--workspaces=false']],
      ['workspaces npm 11', `11.${rMinor}.${rPatch}`, ['--no-workspaces'], [...npm11ArgsGeneral, '--workspaces=false']]
      // endregion no-workspaces
    ])('%s', async (purpose, npmVersion, cdxArgs, expectedArgs) => {
      const logFileBase = join(tmpRootRun, purpose.replace(/\W/g, '_'))
      const cwd = dummyProjectsRoot

      const { res, errFile } = runCLI([
        ...cdxArgs,
        '-vvvv',
        '--',
        join('with-lockfile', 'package.json')
      ], logFileBase, cwd, {
        CT_VERSION: npmVersion,
        CT_EXPECTED_ARGS: expectedArgs.join(' '),
        npm_execpath: npmLsReplacement.checkArgs
      })

      try {
        await expect(res).resolves.toBe(0)
      } catch (err) {
        process.stderr.write(readFileSync(errFile))
        throw err
      }
    }, cliRunTestTimeout)
  })

  describe('prevent shell injection', () => {
    const tmpRootRun = join(tmpRoot, 'shell_injection_proof')
    mkdirSync(tmpRootRun)

    const runsOnWindows = process.platform.startsWith('win')

    const npmExecpaths = {
      'js-file': npmLsReplacement.justExit,
    }
    if (runsOnWindows) {
      npmExecpaths["cmd-file"] = npmLsReplacement.justExitCmd
    }

    const mkPayload4type = {
      'shell metacharacters': function (sentinelFile) {
        return runsOnWindows
          ? ` & type nul > "${sentinelFile}" & echo `
          : ` ; touch '${sentinelFile}' ; echo `
      },
      'shell metacharacters single-quote': function (sentinelFile) {
        return runsOnWindows
          ? `' & type nul > "${sentinelFile}" & echo '`
          : `' ; touch '${sentinelFile}' ; echo '`
      },
      'shell metacharacters double-quote': function (sentinelFile) {
        return runsOnWindows
          ? `" & type nul > "${sentinelFile}" & echo "`
          : `" ; touch '${sentinelFile}' ; echo "`
      },
    }

    const cases = []
    for (const [npmExecpathLabel, npmExecpath] of Object.entries(npmExecpaths)) {
      for (const [payloadType, mkPayload] of Object.entries(mkPayload4type)) {
        const payloadFilePrefix = `${npmExecpathLabel}-${payloadType}`.replace(/\W/g, '-')
        let sentinelFile = join(tmpRootRun, `sentinelFile_${payloadFilePrefix}_workspace-single.txt`)
        cases.push([
          `${payloadType} on ${npmExecpathLabel} with single --workspace with shell metacharacters`,
          npmExecpath,
          ['--workspace', mkPayload(sentinelFile)],
          sentinelFile
        ])
        sentinelFile = join(tmpRootRun, `sentinelFile_${payloadFilePrefix}_workspace-chained.txt`)
        cases.push([
          `${payloadType} on ${npmExecpathLabel} with chained --workspace: legitimate then malicious`,
          npmExecpath,
          ['--workspace', 'legitimate-workspace', '-w', mkPayload(sentinelFile)],
          sentinelFile
        ])
      }
    }

    test.each(cases)('%s', async (purpose, npmExecpath, cdxArgs, sentinelFile) => {
      expect(existsSync(sentinelFile)).toBe(false)

      const logFileBase = join(tmpRootRun, purpose.replace(/\W/g, '_'))
      const cwd = dummyProjectsRoot

      const { res, outFile, errFile } = runCLI([
        ...cdxArgs,
        '-vvvv',
        '--',
        join('with-lockfile', 'package.json')
      ], logFileBase, cwd, {
        npm_execpath: npmExecpath,
        CT_VERSION: `${NPM_LATETS}.0.0`
      })
      await res.catch(() => { /* pass */ })

      process.stdout.write(outFile)
      process.stdout.write(readFileSync(outFile))
      process.stderr.write(outFile)
      process.stderr.write(readFileSync(errFile))

      expect(existsSync(sentinelFile)).toBe(false)
    }, cliRunTestTimeout)
  })
})
