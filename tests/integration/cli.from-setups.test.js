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

const { spawnSync } = require('child_process')
const { dirname, join } = require('path')
const { writeFileSync, readFileSync, existsSync } = require('fs')

const { describe, expect, test } = require('@jest/globals')

const { makeReproducible, getNpmVersion, regexEscape } = require('../_helper')
const { UPDATE_SNAPSHOTS, mkTemp, cliWrapper, latestCdxSpecVersion, dummyProjectsRoot, dummyResultsRoot, projectDemoRootPath, demoResultsRoot } = require('./')

describe('integration.cli.from-setups', () => {
  // some test beds might be skipped
  const skipAllTests = getNpmVersion()[0] < 8

  const cliRunTestTimeout = 15000

  const tmpRoot = mkTemp('cli.from-setups')

  const formats = ['json', 'xml']

  describe('dummy_projects', () => {
    const useCases = [
      {
        subject: 'bare',
        args: [],
        dummyProject: ['with-prepared']
      },
      {
        subject: 'flat',
        args: [],
        dummyProject: ['with-prepared']
      },
      {
        subject: 'with-licenses',
        args: ['--gather-license-texts'],
        dummyProject: ['with-prepared']
      }
    ]

    function runTest (subject, project, format, additionalCliArgs = []) {
      const expectedOutSnap = join(dummyResultsRoot, subject, `${project}.snap.${format}`)
      const outFile = join(tmpRoot, subject, `${project}.${format}`)
      const outDirExisted = existsSync(dirname(outFile))
      // no need to create that outFile dir first - the tool is expected to do that for us
      const res = spawnSync(
        process.execPath,
        ['--', cliWrapper,
          ...additionalCliArgs,
          '--spec-version', latestCdxSpecVersion,
          '--output-format', format,
          '--output-reproducible',
          '--output-file', outFile,
          '--validate',
          '-vvv'
        ], {
          cwd: join(dummyProjectsRoot, project),
          stdio: ['ignore', 'ignore', 'pipe'],
          encoding: 'utf8'
        }
      )
      try {
        expect(res.status).toBe(0)
      } catch (err) {
        process.stderr.write('\n')
        process.stderr.write(res.stderr)
        process.stderr.write('\n')
        throw err
      }

      const expectStdErr = expect(res.stderr);
      (outDirExisted ? expectStdErr.not : expectStdErr).toContain(`creating directory ${dirname(outFile)}`)
      expectStdErr.toMatch(new RegExp(`wrote \\d+ bytes to ${regexEscape(outFile)}`))

      const actualOutput = makeReproducible(format, readFileSync(outFile, 'utf8'))

      if (UPDATE_SNAPSHOTS) {
        writeFileSync(expectedOutSnap, actualOutput, 'utf8')
      }

      expect(actualOutput).toEqual(
        readFileSync(expectedOutSnap, 'utf8'),
        `${outFile} should equal ${expectedOutSnap}`
      )
    }

    describe.each(useCases)('subject: $subject', (ud) => {
      describe.each(ud.dummyProject)('dummyProject: %s', (dummyProject) => {
        describe.each(formats)('format: %s', (format) => {
          (skipAllTests
            ? test.skip
            : test
          )('run', () => {
            runTest(ud.subject, dummyProject, format, ud.args)
          }, cliRunTestTimeout)
        })
      })
    })
  })

  // skipped for now
  describe.skip('demos', () => {
    const demos = [
      'alternative-package-registry',
      'bundled-dependencies',
      // 'deps-from-git',
      'dev-dependencies',
      // 'juice-shop',
      'local-dependencies',
      'local-workspaces',
      'package-integrity',
      'package-with-build-id'
    ]

    /**
     * @param {string} demo
     * @param {string} oType
     * @param {'json'|'xml'} format
     * @param {string[]} [additionalCliArgs]
     */
    function runTest (demo, oType, format, additionalCliArgs = []) {
      const expectedOutSnap = join(demoResultsRoot, oType, `${demo}_from-setup.snap.${format}`)
      const outFile = join(tmpRoot, `${demo}_${oType}.${format}`)
      const res = spawnSync(
        process.execPath,
        ['--', cliWrapper,
          ...additionalCliArgs,
          '--spec-version', latestCdxSpecVersion,
          '--output-format', format,
          '--output-reproducible',
          '--output-file', outFile,
          '--validate'
        ], {
          cwd: join(projectDemoRootPath, demo, 'project'),
          stdio: ['ignore', 'inherit', 'pipe'],
          encoding: 'utf8'
        }
      )
      try {
        expect(res.status).toBe(0)
      } catch (err) {
        process.stderr.write('\n')
        process.stderr.write(res.stderr)
        process.stderr.write('\n')
        throw err
      }
      const actualOutput = makeReproducible(format, readFileSync(outFile, 'utf8'))

      if (UPDATE_SNAPSHOTS) {
        writeFileSync(expectedOutSnap, actualOutput, 'utf8')
      }

      expect(actualOutput).toEqual(
        readFileSync(expectedOutSnap, 'utf8'),
      `${outFile} should equal ${expectedOutSnap}`
      )
    }

    for (const demo of demos) {
      describe(`demo: ${demo}`, () => {
        for (const format of formats) {
          describe(`format: ${format}`, () => {
            (skipAllTests
              ? test.skip
              : test
            )('bare', () => {
              runTest(demo, 'bare', format)
            }, cliRunTestTimeout);

            (skipAllTests
              ? test.skip
              : test
            )('flat', () => {
              runTest(demo, 'flatten-components', format, ['--flatten-components'])
            }, cliRunTestTimeout)
          })
        }
      })
    }
  })
})
