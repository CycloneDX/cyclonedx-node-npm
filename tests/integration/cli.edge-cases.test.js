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
const { mkdirSync, writeFileSync, readFileSync } = require('fs')

const { describe, expect, test } = require('@jest/globals')

const { makeReproducible } = require('../_helper')
const { UPDATE_SNAPSHOTS, mkTemp, runCLI, latestCdxSpecVersion, dummyProjectsRoot, npmLsReplacement, demoResultsRoot } = require('./')

describe('integration.cli.edge-cases', () => {
  const cliRunTestTimeout = 15000

  const tmpRoot = mkTemp('cli.edge_cases')

  describe('broken project', () => {
    const tmpRootRun = join(tmpRoot, 'broken-project')
    mkdirSync(tmpRootRun)

    test.each([
      ['no-lockfile', /missing evidence/i],
      ['no-manifest', /missing .*manifest file/i]
    ])('%s', async (folderName, expectedError) => {
      const logFileBase = join(tmpRootRun, folderName)
      const cwd = join(dummyProjectsRoot, folderName)

      const { res, errFile } = runCLI([], logFileBase, cwd, { npm_execpath: undefined })

      try {
        await expect(res).rejects.toThrow(expectedError)
      } catch (err) {
        process.stderr.write(readFileSync(errFile))
        throw err
      }
    }, cliRunTestTimeout)
  })

  describe('with broken npm-ls', () => {
    const tmpRootRun = join(tmpRoot, 'with-broken')
    mkdirSync(tmpRootRun)

    test('error on non-existing binary', async () => {
      const logFileBase = join(tmpRootRun, 'non-existing')
      const cwd = join(dummyProjectsRoot, 'with-lockfile')

      const { res, errFile } = runCLI([], logFileBase, cwd, {
        npm_execpath: npmLsReplacement.nonExistingBinary
      })

      try {
        await expect(res).rejects.toThrow(/^unexpected npm execpath/i)
      } catch (err) {
        process.stderr.write(readFileSync(errFile))
        throw err
      }
    }, cliRunTestTimeout)

    test('error on non-zero exit', async () => {
      const logFileBase = join(tmpRootRun, 'error-exit-nonzero')
      const cwd = join(dummyProjectsRoot, 'with-lockfile')

      const expectedExitCode = 1 + Math.floor(254 * Math.random())

      const { res, errFile } = runCLI([], logFileBase, cwd, {
        CT_VERSION: '8.99.0',
        // non-zero exit code
        CT_EXIT_CODE: `${expectedExitCode}`,
        npm_execpath: npmLsReplacement.justExit
      })

      try {
        await expect(res).rejects.toThrow(`npm-ls exited with errors: ${expectedExitCode} noSignal`)
      } catch (err) {
        process.stderr.write(readFileSync(errFile))
        throw err
      }
    }, cliRunTestTimeout)

    test('error on broken json response', async () => {
      const logFileBase = join(tmpRootRun, 'error-json-broken')
      const cwd = join(dummyProjectsRoot, 'with-lockfile')

      const { res, errFile } = runCLI([], logFileBase, cwd, {
        CT_VERSION: '8.99.0',
        // abuse the npm-ls replacement, as it can be caused to crash under control.
        npm_execpath: npmLsReplacement.brokenJson
      })

      try {
        await expect(res).rejects.toThrow(/failed to parse npm-ls response/i)
      } catch (err) {
        process.stderr.write(readFileSync(errFile))
        throw err
      }
    }, cliRunTestTimeout)
  })

  test('suppressed error on non-zero exit', async () => {
    const dd = { subject: 'dev-dependencies', npm: '8', node: '14', os: 'ubuntu-latest' }

    mkdirSync(join(tmpRoot, 'suppressed-error-on-non-zero-exit'))
    const expectedOutSnap = join(demoResultsRoot, 'suppressed-error-on-non-zero-exit', `${dd.subject}_npm${dd.npm}_node${dd.node}_${dd.os}.snap.json`)
    const logFileBase = join(tmpRoot, 'suppressed-error-on-non-zero-exit', `${dd.subject}_npm${dd.npm}_node${dd.node}_${dd.os}`)
    const cwd = dummyProjectsRoot

    const expectedExitCode = 1 + Math.floor(254 * Math.random())

    const { res, outFile, errFile } = runCLI([
      '-vvv',
      '--ignore-npm-errors',
      '--output-reproducible',
      // no intention to test all the spec-versions nor all the output-formats - this would be not our scope.
      '--spec-version', `${latestCdxSpecVersion}`,
      '--output-format', 'JSON',
      // prevent file interaction in this synthetic scenario - they would not exist anyway
      '--package-lock-only',
      '--',
      join('with-lockfile', 'package.json')
    ], logFileBase, cwd, {
      CT_VERSION: `${dd.npm}.99.0`,
      // non-zero exit code
      CT_EXIT_CODE: expectedExitCode,
      CT_SUBJECT: dd.subject,
      CT_NPM: dd.npm,
      CT_NODE: dd.node,
      CT_OS: dd.os,
      npm_execpath: npmLsReplacement.demoResults
    })

    try {
      await expect(res).resolves.toBe(0)
    } catch (err) {
      process.stderr.write(readFileSync(errFile))
      throw err
    }

    const actualOutput = makeReproducible('json', readFileSync(outFile, 'utf8'))

    if (UPDATE_SNAPSHOTS) {
      writeFileSync(expectedOutSnap, actualOutput, 'utf8')
    }

    expect(actualOutput).toEqual(
      readFileSync(expectedOutSnap, 'utf8'),
      `${outFile} should equal ${expectedOutSnap}`
    )
  }, cliRunTestTimeout)

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

    test.each([
      ['basic npm 6', `6.${rMinor}.${rPatch}`, [], npm6ArgsGeneral],
      ['basic npm 7', `7.${rMinor}.${rPatch}`, [], npm7ArgsGeneral],
      ['basic npm 8', `8.${rMinor}.${rPatch}`, [], npm8ArgsGeneral],
      ['basic npm 9', `9.${rMinor}.${rPatch}`, [], npm9ArgsGeneral],
      ['basic npm 10', `10.${rMinor}.${rPatch}`, [], npm10ArgsGeneral],
      // region omit
      ['omit everything npm 6', `6.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm6ArgsGeneral, '--production']],
      ['omit everything npm 7', `7.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm7ArgsGeneral, '--production']],
      ['omit everything npm lower 8.7', `8.${le6}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm8ArgsGeneral, '--production']],
      ['omit everything npm greater-equal 8.7', `8.${ge7}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm8ArgsGeneral, '--omit=dev', '--omit=optional', '--omit=peer']],
      ['omit everything npm 9', `9.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm9ArgsGeneral, '--omit=dev', '--omit=optional', '--omit=peer']],
      ['omit everything npm 10', `10.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm10ArgsGeneral, '--omit=dev', '--omit=optional', '--omit=peer']],
      // endregion
      // region package-lock-only
      ['package-lock-only not supported npm 6 ', `6.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm6ArgsGeneral]],
      ['package-lock-only npm 7', `7.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm7ArgsGeneral, '--package-lock-only']],
      ['package-lock-only npm 8', `8.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm8ArgsGeneral, '--package-lock-only']],
      ['package-lock-only npm 9', `9.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm9ArgsGeneral, '--package-lock-only']],
      ['package-lock-only npm 10', `10.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm10ArgsGeneral, '--package-lock-only']]
      // endregion
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
