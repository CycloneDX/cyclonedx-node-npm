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

const { join } = require('path')
const { mkdirSync, readFileSync } = require('fs')

const { describe, expect, test } = require('@jest/globals')

const { mkTemp, runCLI, dummyProjectsRoot, npmLsReplacement } = require('./')

describe('integration.cli.args-pass-through', () => {
  const cliRunTestTimeout = 15000

  const tmpRoot = mkTemp('cli.args-pass-through')

  describe('npm-version depending npm-args', () => {
    const tmpRootRun = join(tmpRoot, 'npmVersion-depending-npmArgs')
    mkdirSync(tmpRootRun)

    const rMinor = Math.round(99 * Math.random())
    const rPatch = Math.round(99 * Math.random())
    const le6 = Math.round(6 * Math.random())
    const ge7 = 7 + Math.round(92 * Math.random())

    const npmArgsGeneral = ['--json', '--long']
    const npm6ArgsGeneral = [...npmArgsGeneral, '--depth=255']
    const npm7ArgsGeneral = [...npmArgsGeneral, '--all']
    const npm8ArgsGeneral = [...npmArgsGeneral, '--all']
    const npm9ArgsGeneral = [...npmArgsGeneral, '--all']
    const npm10ArgsGeneral = [...npmArgsGeneral, '--all']
    const npm11ArgsGeneral = [...npmArgsGeneral, '--all']

    test.each([
      // region basic
      ['basic npm 6', `6.${rMinor}.${rPatch}`, [], npm6ArgsGeneral],
      ['basic npm 7', `7.${rMinor}.${rPatch}`, [], npm7ArgsGeneral],
      ['basic npm 8', `8.${rMinor}.${rPatch}`, [], npm8ArgsGeneral],
      ['basic npm 9', `9.${rMinor}.${rPatch}`, [], npm9ArgsGeneral],
      ['basic npm 10', `10.${rMinor}.${rPatch}`, [], npm10ArgsGeneral],
      ['basic npm 11', `11.${rMinor}.${rPatch}`, [], npm11ArgsGeneral],
      // endregion basic
      // region omit
      ['omit everything npm 6', `6.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm6ArgsGeneral, '--production']],
      ['omit everything npm 7', `7.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm7ArgsGeneral, '--production']],
      ['omit everything npm lower 8.7', `8.${le6}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm8ArgsGeneral, '--production']],
      ['omit everything npm greater-equal 8.7', `8.${ge7}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm8ArgsGeneral, '--omit=dev', '--omit=optional', '--omit=peer']],
      ['omit everything npm 9', `9.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm9ArgsGeneral, '--omit=dev', '--omit=optional', '--omit=peer']],
      ['omit everything npm 10', `10.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm10ArgsGeneral, '--omit=dev', '--omit=optional', '--omit=peer']],
      ['omit everything npm 11', `11.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm11ArgsGeneral, '--omit=dev', '--omit=optional', '--omit=peer']],
      // endregion omit
      // region package-lock-only
      ['package-lock-only not supported npm 6 ', `6.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm6ArgsGeneral]],
      ['package-lock-only npm 7', `7.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm7ArgsGeneral, '--package-lock-only']],
      ['package-lock-only npm 8', `8.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm8ArgsGeneral, '--package-lock-only']],
      ['package-lock-only npm 9', `9.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm9ArgsGeneral, '--package-lock-only']],
      ['package-lock-only npm 10', `10.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm10ArgsGeneral, '--package-lock-only']],
      ['package-lock-only npm 11', `11.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm11ArgsGeneral, '--package-lock-only']],
      // endregion package-lock-only
      // region workspace
      ['workspace not supported npm 6', `6.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB'], [...npm6ArgsGeneral]],
      ['workspace npm 7', `7.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB'], [...npm7ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB']],
      ['workspace npm 8', `8.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB'], [...npm8ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB']],
      ['workspace npm 9', `9.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB'], [...npm9ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB']],
      ['workspace npm 10', `10.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB'], [...npm10ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB']],
      ['workspace npm 11', `11.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB'], [...npm11ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB']],
      // endregion workspace
      // region include-workspace-root
      ['workspace root not supported npm 6', `6.${rMinor}.${rPatch}`, ['-w', 'my-wsA', '--include-workspace-root'], [...npm6ArgsGeneral]],
      ['workspace root not supported npm 7', `7.${rMinor}.${rPatch}`, ['-w', 'my-wsA', '--include-workspace-root'], [...npm7ArgsGeneral, '--workspace=my-wsA']],
      ['workspace root npm 8', `8.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB', '--include-workspace-root'], [...npm8ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB', '--include-workspace-root=true']],
      ['workspace root npm 9', `9.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB', '--include-workspace-root'], [...npm9ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB', '--include-workspace-root=true']],
      ['workspace root npm 10', `10.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB', '--include-workspace-root'], [...npm10ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB', '--include-workspace-root=true']],
      ['workspace root npm 11', `11.${rMinor}.${rPatch}`, ['--workspace', 'my-wsA', '-w', 'my-wsB', '--include-workspace-root'], [...npm11ArgsGeneral, '--workspace=my-wsA', '--workspace=my-wsB', '--include-workspace-root=true']],
      // endregion include-workspace-root
      // region workspaces
      ['workspaces not supported npm 6', `6.${rMinor}.${rPatch}`, ['--workspaces'], [...npm6ArgsGeneral]],
      ['workspaces npm 7', `7.${rMinor}.${rPatch}`, ['--no-workspaces'], [...npm7ArgsGeneral, '--workspaces=false']],
      ['workspaces npm 8', `8.${rMinor}.${rPatch}`, ['--workspaces'], [...npm8ArgsGeneral, '--workspaces=true']],
      ['workspaces npm 9', `9.${rMinor}.${rPatch}`, ['--no-workspaces'], [...npm9ArgsGeneral, '--workspaces=false']],
      ['workspaces npm 10', `10.${rMinor}.${rPatch}`, ['--workspaces'], [...npm10ArgsGeneral, '--workspaces=true']],
      ['workspaces npm 11', `11.${rMinor}.${rPatch}`, ['--no-workspaces'], [...npm11ArgsGeneral, '--workspaces=false']]
      // endregion workspaces
    ])('%s', async (purpose, npmVersion, cdxArgs, expectedArgs) => {
      const logFileBase = join(tmpRootRun, purpose.replace(/\W/g, '_'))
      const cwd = dummyProjectsRoot

      const { res, errFile } = runCLI([
        ...cdxArgs,
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
})
