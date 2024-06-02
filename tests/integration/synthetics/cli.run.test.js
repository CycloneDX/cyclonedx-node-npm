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

const { resolve, join } = require('path')
const { mkdtempSync, mkdirSync, createWriteStream, openSync, writeFileSync, readFileSync } = require('fs')

const { Spec } = require('@cyclonedx/cyclonedx-library')
const { describe, expect, test } = require('@jest/globals')

const { index: indexNpmLsDemoData } = require('../../_data/npm-ls_demo-results')
const { version: thisVersion } = require('../../../package.json')

// const projectRootPath = join(__dirname, '..', '..', '..')
const projectTestRootPath = join(__dirname, '..', '..')

// const binWrapper = join(projectRootPath, 'bin', 'cyclonedx-npm-cli.js')

const cli = require('../../../dist/cli')

const latestCdxSpecVersion = Spec.Version.v1dot6

describe('cli.run()', () => {
  const UPDATE_SNAPSHOTS = !!process.env.CNPM_TEST_UPDATE_SNAPSHOTS
  const cliRunTestTimeout = 15000

  const tmpRoot = mkdtempSync(join(projectTestRootPath, '_log', 'CDX-IT-CLI.run.'))

  const dummyProjectsRoot = resolve(projectTestRootPath, '_data', 'dummy_projects')
  const demoResultsRoot = resolve(projectTestRootPath, '_data', 'sbom_demo-results')
  const npmLsReplacementPath = resolve(projectTestRootPath, '_data', 'npm-ls_replacement')

  const npmLsReplacement = {
    brokenJson: resolve(npmLsReplacementPath, 'broken-json.js'),
    checkArgs: resolve(npmLsReplacementPath, 'check-args.js'),
    demoResults: resolve(npmLsReplacementPath, 'demo-results.js'),
    justExit: resolve(npmLsReplacementPath, 'just-exit.js'),
    nonExistingBinary: resolve(npmLsReplacementPath, 'aNonExistingBinary')
  }

  /**
   * @param {string[]} args
   * @param {string} logFileBase
   * @param {string} cwd
   * @param {Object.<string, string>} env
   * @return {{res: Promise.<number>, outFile:string, errFile:string}}
   */
  function runCLI (args, logFileBase, cwd, env) {
    const outFile = `${logFileBase}.out`
    const outFD = openSync(outFile, 'w')
    const stdout = createWriteStream(null, { fd: outFD })

    const errFile = `${logFileBase}.err`
    const errFD = openSync(errFile, 'w')
    const stderr = createWriteStream(null, { fd: errFD })

    /** @type Partial<NodeJS.Process> */
    const mockProcess = {
      stdout,
      stderr,
      cwd: () => cwd,
      execPath: process.execPath,
      argv0: process.argv0,
      argv: [
        process.argv[0],
        'dummy_process',
        ...args
      ],
      env: {
        ...process.env,
        ...env
      }
    }

    /** @type Promise.<number> */
    const res = cli.run(mockProcess)

    return { res, outFile, errFile }
  }

  describe('broken project', () => {
    const tmpRootRun = join(tmpRoot, 'broken-project')
    mkdirSync(tmpRootRun)

    test.each([
      ['no-lockfile', /missing evidence/i],
      ['no-manifest', /missing .*manifest file/i]
    ])('%s', async (folderName, expectedError) => {
      const logFileBase = join(tmpRootRun, folderName)
      const cwd = resolve(dummyProjectsRoot, folderName)

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
      const cwd = resolve(dummyProjectsRoot, 'with-lockfile')

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
      const cwd = resolve(dummyProjectsRoot, 'with-lockfile')

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
      const cwd = resolve(dummyProjectsRoot, 'with-lockfile')

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

  describe('with prepared npm-ls', () => {
    const tmpRootRun = join(tmpRoot, 'with-prepared')
    mkdirSync(tmpRootRun)

    const useCases = [
      { subject: 'bare', args: [] },
      { subject: 'flatten-components', args: ['--flatten-components'] }
    ]
    const demoCases = indexNpmLsDemoData()
    describe.each(useCases)('$subject', (ud) => {
      mkdirSync(join(tmpRootRun, ud.subject))

      test.each(demoCases)('$subject npm$npm node$node $os', async (dd) => {
        const expectedOutSnap = resolve(demoResultsRoot, ud.subject, `${dd.subject}_npm${dd.npm}_node${dd.node}_${dd.os}.snap.json`)
        const logFileBase = join(tmpRootRun, ud.subject, `${dd.subject}_npm${dd.npm}_node${dd.node}_${dd.os}`)
        const cwd = resolve(projectTestRootPath, '_data', 'dummy_projects')

        const { res, outFile, errFile } = runCLI([
          '-vvv',
          '--output-reproducible',
          '--validate',
          // no intention to test all the spec-versions nor all the output-formats - this would be not our scope.
          '--spec-version', `${latestCdxSpecVersion}`,
          // just use json with the latest most feature-rich version.
          '--output-format', 'JSON',
          // prevent file interaction in this synthetic scenario - they would not exist anyway
          '--package-lock-only',
          // case-specific args
          ...ud.args,
          '--',
          // just some dummy project
          join('with-lockfile', 'package.json')
        ], logFileBase, cwd, {
          CT_VERSION: `${dd.npm}.99.0`,
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
    })
  })

  test('suppressed error on non-zero exit', async () => {
    const dd = { subject: 'dev-dependencies', npm: '8', node: '14', os: 'ubuntu-latest' }

    mkdirSync(join(tmpRoot, 'suppressed-error-on-non-zero-exit'))
    const expectedOutSnap = resolve(demoResultsRoot, 'suppressed-error-on-non-zero-exit', `${dd.subject}_npm${dd.npm}_node${dd.node}_${dd.os}.snap.json`)
    const logFileBase = join(tmpRoot, 'suppressed-error-on-non-zero-exit', `${dd.subject}_npm${dd.npm}_node${dd.node}_${dd.os}`)
    const cwd = resolve(projectTestRootPath, '_data', 'dummy_projects')

    const expectedExitCode = 1 + Math.floor(254 * Math.random())

    const { res, outFile, errFile } = runCLI([
      'dummy_process',
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

    test.each([
      ['basic npm 6', `6.${rMinor}.${rPatch}`, [], npm6ArgsGeneral],
      ['basic npm 7', `7.${rMinor}.${rPatch}`, [], npm7ArgsGeneral],
      ['basic npm 8', `8.${rMinor}.${rPatch}`, [], npm8ArgsGeneral],
      // region omit
      ['omit everything npm 6', `6.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm6ArgsGeneral, '--production']],
      ['omit everything npm 7', `7.${rMinor}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm7ArgsGeneral, '--production']],
      ['omit everything npm lower 8.7', `8.${le6}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm8ArgsGeneral, '--production']],
      ['omit everything npm greater-equal 8.7 ', `8.${ge7}.${rPatch}`, ['--omit', 'dev', 'optional', 'peer'], [...npm8ArgsGeneral, '--omit=dev', '--omit=optional', '--omit=peer']],
      // endregion
      // region package-lock-only
      ['package-lock-only not supported npm 6 ', `6.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm6ArgsGeneral]],
      ['package-lock-only npm 7', `7.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm7ArgsGeneral, '--package-lock-only']],
      ['package-lock-only npm 8', `8.${rMinor}.${rPatch}`, ['--package-lock-only'], [...npm8ArgsGeneral, '--package-lock-only']]
      // endregion
    ])('%s', async (purpose, npmVersion, cdxArgs, expectedArgs) => {
      const logFileBase = join(tmpRootRun, purpose.replace(/\W/g, '_'))
      const cwd = resolve(projectTestRootPath, '_data', 'dummy_projects')

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

/**
 * @param {string} format
 * @param {*} data
 * @returns {string}
 */
function makeReproducible (format, data) {
  switch (format.toLowerCase()) {
    case 'xml':
      return makeXmlReproducible(data)
    case 'json':
      return makeJsonReproducible(data)
    default:
      throw new RangeError(`unexpected format: ${format}`)
  }
}

/**
 * @param {string} json
 * @returns {string}
 */
function makeJsonReproducible (json) {
  return json
    .replace(
      // replace metadata.tools.version
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "cyclonedx-npm",\n' +
      `        "version": ${JSON.stringify(thisVersion)},\n`,
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "cyclonedx-npm",\n' +
      '        "version": "thisVersion-testing",\n'
    ).replace(
      // replace metadata.tools.version
      new RegExp(
        '        "vendor": "@cyclonedx",\n' +
        '        "name": "cyclonedx-library",\n' +
        '        "version": ".+?",\n'
      ),
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "cyclonedx-library",\n' +
      '        "version": "libVersion-testing",\n'
    )
}

/**
 * @param {string} xml
 * @returns {string}
 *
 * eslint-disable-next-line no-unused-vars
 */
function makeXmlReproducible (xml) {
  return xml
    .replace(
      // replace metadata.tools.version
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>cyclonedx-npm</name>\n' +
      `        <version>${thisVersion}</version>`,
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>cyclonedx-npm</name>\n' +
      '        <version>thisVersion-testing</version>'
    ).replace(
      // replace metadata.tools.version
      new RegExp(
        '        <vendor>@cyclonedx</vendor>\n' +
        '        <name>cyclonedx-library</name>\n' +
        '        <version>.+?</version>'
      ),
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>cyclonedx-library</name>\n' +
      '        <version>libVersion-testing</version>'
    )
}
