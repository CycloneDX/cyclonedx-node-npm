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
  const tmpRoot = mkdtempSync(join(__dirname, '..', '..', '_log', 'CDX-IT-CLI.'))

  const npmLsReplacement = resolve(__dirname, '..', '..', '_data', 'npm-ls_demo-results', 'npm-ls_replacement')

  describe('with broken npm-ls', () => {
    const tmpRootRun = join(tmpRoot, 'run-broken')
    mkdirSync(tmpRootRun)

    test('non-existing', () => {
      const logFileBase = join(tmpRootRun, 'non-existing')

      const outFile = `${logFileBase}.out`
      const outFD = openSync(outFile, 'w')
      const stdout = createWriteStream(outFile, { fd: outFD })

      const errFile = `${logFileBase}.err`
      const errFD = openSync(errFile, 'w')
      const stderr = createWriteStream(errFile, { fd: errFD })

      const mockProcess = {
        stdout: stdout,
        stderr: stderr,
        cwd: () => resolve(__dirname, '..', '..', '_data', 'dummy_project'),
        argv0: process.argv0,
        argv: [
          process.argv[0],
          'dummy_process'
        ],
        env: {
          npm_execpath: resolve(__dirname, 'a-missing-executable')
        }
      }

      try {
        expect(() => {
          cli.run(mockProcess)
        }).toThrow(/^npm-ls exited with errors: \?\?\? \d+ noSignal$/i)
      } finally {
        closeSync(outFD)
        closeSync(errFD)
      }
    })

    test('error exit', () => {
      const logFileBase = join(tmpRootRun, 'error-exit')

      const outFile = `${logFileBase}.out`
      const outFD = openSync(outFile, 'w')
      const stdout = createWriteStream(outFile, { fd: outFD })

      const errFile = `${logFileBase}.err`
      const errFD = openSync(errFile, 'w')
      const stderr = createWriteStream(errFile, { fd: errFD })

      const mockProcess = {
        stdout: stdout,
        stderr: stderr,
        cwd: () => resolve(__dirname, '..', '..', '_data', 'dummy_project'),
        argv0: process.argv0,
        argv: [
          process.argv[0],
          'dummy_process'
        ],
        env: {
          CT_EXPECTED_ARGS: 'some unexpected to cause a crash',
          // abuse the npm-ls replacement, as it can be caused to crash under control.
          npm_execpath: npmLsReplacement
        }
      }

      try {
        expect(() => {
          cli.run(mockProcess)
        }).toThrow(/^npm-ls exited with errors: \?\?\? 1 noSignal$/i)
      } finally {
        closeSync(outFD)
        closeSync(errFD)
      }
    })
  })

  describe('with prepared npm-ls', () => {
    const tmpRootRun = join(tmpRoot, 'run-prepared')
    mkdirSync(tmpRootRun)

    const cases = indexNpmLsDemoData()

    test.each(cases)('$subject npm$npm node$node $os', (dd) => {
      const expectedOutSnap = resolve(__dirname, '..', '..', '_data', 'sbom_demo-results', `${dd.subject}_npm${dd.npm}_node${dd.node}_${dd.os}.snap.json`)

      const logFileBase = join(tmpRootRun, `${dd.subject}_npm${dd.npm}_node${dd.node}_${dd.os}`)

      const outFile = `${logFileBase}.out`
      const outFD = openSync(outFile, 'w')
      const stdout = createWriteStream(outFile, { fd: outFD })

      const errFile = `${logFileBase}.err`
      const errFD = openSync(errFile, 'w')
      const stderr = createWriteStream(errFile, { fd: errFD })

      const mockProcess = {
        stdout: stdout,
        stderr: stderr,
        cwd: () => resolve(__dirname, '..', '..', '_data'),
        argv0: process.argv0,
        argv: [
          process.argv[0],
          'dummy_process',
          // no intention to test all the spec-versions nor all the output-formats - this would be not our scope.
          '--output-reproducible',
          '--spec-version', '1.4',
          '--output-format', 'JSON',
          join('dummy_project', 'package.json')
        ],
        env: {
          CT_EXPECTED_ARGS: ['ls', '--json', '--all', '--long'].join(' '),
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
        closeSync(outFD)
        closeSync(errFD)
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
})
