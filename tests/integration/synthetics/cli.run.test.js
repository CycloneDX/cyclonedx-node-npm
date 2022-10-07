'use strict'

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
const {
  mkdtempSync, mkdirSync,
  createWriteStream,
  openSync, closeSync, existsSync, writeFileSync, readFileSync
} = require('fs')

const { index: indexNpmLsDemoData } = require('../../_data/npm-ls_demo-results')
const { version: thisVersion } = require('../../../package.json')

const cli = require('../../../dist/cli')

describe('cli.run()', () => {
  const tmpRoot = mkdtempSync(join(__dirname, '..', '..', '_log', 'CDX-IT-CLI.run.'))

  const npmLsReplacement = resolve(__dirname, '..', '..', '_data', 'npm-ls_demo-results', 'npm-ls_replacement.js')

  describe('broken project', () => {
    const tmpRootRun = join(tmpRoot, 'broken-project')
    mkdirSync(tmpRootRun)

    test.each([
      ['no-lockfile', /missing .*(?:lock|shrinkwrap) file/i],
      ['no-manifest', /missing .*manifest file/i]
    ])('%s', (folderName, expectedError) => {
      const logFileBase = join(tmpRootRun, folderName)

      const outFile = `${logFileBase}.out`
      const stdout = { fd: openSync(outFile, 'w') } // not perfect, but works

      const errFile = `${logFileBase}.err`
      const stderr = createWriteStream(errFile) // not perfect, but works

      const mockProcess = {
        stdout,
        stderr,
        cwd: () => resolve(__dirname, '..', '..', '_data', 'dummy_projects', folderName),
        execPath: process.execPath,
        argv0: process.argv0,
        argv: [
          process.argv[0],
          'dummy_process'
        ],
        env: {
          ...process.env
        }
      }

      try {
        expect(() => {
          cli.run(mockProcess)
        }).toThrow(expectedError)
      } finally {
        closeSync(stdout.fd)
        stderr.close()
      }
    })
  })

  describe('with broken npm-ls', () => {
    const tmpRootRun = join(tmpRoot, 'with-broken')
    mkdirSync(tmpRootRun)

    test('error on non-existing binary', () => {
      const logFileBase = join(tmpRootRun, 'non-existing')

      const outFile = `${logFileBase}.out`
      const stdout = { fd: openSync(outFile, 'w') } // not perfect, but works

      const errFile = `${logFileBase}.err`
      const stderr = createWriteStream(errFile) // not perfect, but works

      const mockProcess = {
        stdout,
        stderr,
        cwd: () => resolve(__dirname, '..', '..', '_data', 'dummy_projects', 'with-lockfile'),
        execPath: process.execPath,
        argv0: process.argv0,
        argv: [
          process.argv[0],
          'dummy_process'
        ],
        env: {
          ...process.env,
          npm_execpath: resolve(__dirname, 'a-missing-executable')
        }
      }

      try {
        expect(() => {
          cli.run(mockProcess)
        }).toThrow(/^npm-ls exited with errors: \?\?\? [1-9]\d* noSignal$/i)
      } finally {
        closeSync(stdout.fd)
        stderr.close()
      }
    })

    test('error on non-zero exit', () => {
      const logFileBase = join(tmpRootRun, 'error-exit-nonzero')

      const expectedExitCode = 1 + Math.floor(254 * Math.random())

      const outFile = `${logFileBase}.out`
      const stdout = { fd: openSync(outFile, 'w') } // not perfect, but works

      const errFile = `${logFileBase}.err`
      const stderr = createWriteStream(errFile) // not perfect, but works

      const mockProcess = {
        stdout,
        stderr,
        cwd: () => resolve(__dirname, '..', '..', '_data', 'dummy_projects', 'with-lockfile'),
        execPath: process.execPath,
        argv0: process.argv0,
        argv: [
          process.argv[0],
          'dummy_process'
        ],
        env: {
          ...process.env,
          CT_EXIT_CODE: `${expectedExitCode}`, // non-zero exit code
          CT_SUBJECT: 'just-exit',
          // abuse the npm-ls replacement, as it can be caused to crash under control.
          npm_execpath: npmLsReplacement
        }
      }

      try {
        expect(() => {
          cli.run(mockProcess)
        }).toThrow(`npm-ls exited with errors: ??? ${expectedExitCode} noSignal`)
      } finally {
        closeSync(stdout.fd)
        stderr.close()
      }
    })

    test('error on broken json response', () => {
      const logFileBase = join(tmpRootRun, 'error-json-broken')

      const outFile = `${logFileBase}.out`
      const stdout = { fd: openSync(outFile, 'w') } // not perfect, but works

      const errFile = `${logFileBase}.err`
      const stderr = createWriteStream(errFile) // not perfect, but works

      const mockProcess = {
        stdout,
        stderr,
        cwd: () => resolve(__dirname, '..', '..', '_data', 'dummy_projects', 'with-lockfile'),
        execPath: process.execPath,
        argv0: process.argv0,
        argv: [
          process.argv[0],
          'dummy_process'
        ],
        env: {
          ...process.env,
          CT_SUBJECT: 'broken-json',
          // abuse the npm-ls replacement, as it can be caused to crash under control.
          npm_execpath: npmLsReplacement
        }
      }

      try {
        expect(() => {
          cli.run(mockProcess)
        }).toThrow(/failed to parse npm-ls response/i)
      } finally {
        closeSync(stdout.fd)
        stderr.close()
      }
    })
  })

  describe('with prepared npm-ls', () => {
    const tmpRootRun = join(tmpRoot, 'with-prepared')
    mkdirSync(tmpRootRun)

    const cases = indexNpmLsDemoData()

    test.each(cases)('$subject npm$npm node$node $os', (dd) => {
      const expectedOutSnap = resolve(__dirname, '..', '..', '_data', 'sbom_demo-results', `${dd.subject}_npm${dd.npm}_node${dd.node}_${dd.os}.snap.json`)

      const logFileBase = join(tmpRootRun, `${dd.subject}_npm${dd.npm}_node${dd.node}_${dd.os}`)

      const outFile = `${logFileBase}.out`
      const stdout = { fd: openSync(outFile, 'w') } // not perfect, but works

      const errFile = `${logFileBase}.err`
      const stderr = createWriteStream(errFile) // not perfect, but works

      const mockProcess = {
        stdout,
        stderr,
        cwd: () => resolve(__dirname, '..', '..', '_data'),
        execPath: process.execPath,
        argv0: process.argv0,
        argv: [
          process.argv[0],
          'dummy_process',
          // no intention to test all the spec-versions nor all the output-formats - this would be not our scope.
          '--output-reproducible',
          '--spec-version', '1.4',
          '--output-format', 'JSON',
          // prevent file interaction in this synthetic scenario - they would not exist anyway
          '--package-lock-only',
          '--',
          join('dummy_projects', 'with-lockfile', 'package.json')
        ],
        env: {
          ...process.env,
          CT_EXPECTED_ARGS: ['ls', '--json', '--all', '--long', '--package-lock-only'].join(' '),
          CT_SUBJECT: dd.subject,
          CT_NPM: dd.npm,
          CT_NODE: dd.node,
          CT_OS: dd.os,
          npm_execpath: npmLsReplacement
        }
      }

      try {
        cli.run(mockProcess)
      } finally {
        closeSync(stdout.fd)
        stderr.close()
      }

      const actualOutput = readFileSync(outFile, 'utf8').replace(
        // replace metadata.tools.version
        `"vendor": "@cyclonedx",
        "name": "cyclonedx-npm",
        "version": ${JSON.stringify(thisVersion)},`,
        `"vendor": "@cyclonedx",
        "name": "cyclonedx-npm",
        "version": "thisVersion-testing",`
      )

      if (!existsSync(expectedOutSnap)) {
        writeFileSync(expectedOutSnap, actualOutput, 'utf8')
      }

      expect(actualOutput).toEqual(
        readFileSync(expectedOutSnap, 'utf8'),
        `${outFile} should equal ${expectedOutSnap}`
      )
    })
  })

  test('suppressed error on non-zero exit', () => {
    const dd = { subject: 'dev-dependencies', npm: '8', node: '16', os: 'ubuntu-latest' }

    const expectedOutSnap = resolve(__dirname, '..', '..', '_data', 'sbom_demo-results', `${dd.subject}_npm${dd.npm}_node${dd.node}_${dd.os}.snap.json`)
    const expectedExitCode = 1 + Math.floor(254 * Math.random())

    const tmpRootRun = join(tmpRoot, 'suppressed-error-on-non-zero-exit')
    mkdirSync(tmpRootRun)
    const logFileBase = join(tmpRootRun, `${dd.subject}_npm${dd.npm}_node${dd.node}_${dd.os}`)

    const outFile = `${logFileBase}.out`
    const stdout = { fd: openSync(outFile, 'w') } // not perfect, but works

    const errFile = `${logFileBase}.err`
    const stderr = createWriteStream(errFile) // not perfect, but works

    const mockProcess = {
      stdout,
      stderr,
      cwd: () => resolve(__dirname, '..', '..', '_data'),
      execPath: process.execPath,
      argv0: process.argv0,
      argv: [
        process.argv[0],
        'dummy_process',
        '--ignore-npm-errors',
        // no intention to test all the spec-versions nor all the output-formats - this would be not our scope.
        '--output-reproducible',
        '--spec-version', '1.4',
        '--output-format', 'JSON',
        // prevent file interaction in this synthetic scenario - they would not exist anyway
        '--package-lock-only',
        '--',
        join('dummy_projects', 'with-lockfile', 'package.json')
      ],
      env: {
        ...process.env,
        CT_EXIT_CODE: expectedExitCode, // non-zero exit code
        CT_EXPECTED_ARGS: ['ls', '--json', '--all', '--long', '--package-lock-only'].join(' '),
        CT_SUBJECT: dd.subject,
        CT_NPM: dd.npm,
        CT_NODE: dd.node,
        CT_OS: dd.os,
        npm_execpath: npmLsReplacement
      }
    }

    try {
      cli.run(mockProcess)
    } finally {
      closeSync(stdout.fd)
      stderr.close()
    }

    const actualOutput = readFileSync(outFile, 'utf8').replace(
      // replace metadata.tools.version
      `"vendor": "@cyclonedx",
        "name": "cyclonedx-npm",
        "version": ${JSON.stringify(thisVersion)},`,
      `"vendor": "@cyclonedx",
        "name": "cyclonedx-npm",
        "version": "thisVersion-testing",`
    )

    if (!existsSync(expectedOutSnap)) {
      writeFileSync(expectedOutSnap, actualOutput, 'utf8')
    }

    expect(actualOutput).toEqual(
      readFileSync(expectedOutSnap, 'utf8'),
      `${outFile} should equal ${expectedOutSnap}`
    )
  })
})
