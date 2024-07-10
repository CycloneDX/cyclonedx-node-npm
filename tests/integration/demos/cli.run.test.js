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
const { resolve, join } = require('path')
const { mkdtempSync, writeFileSync, readFileSync } = require('fs')

const { describe, expect, test } = require('@jest/globals')
const { Spec } = require('@cyclonedx/cyclonedx-library')
const { makeReproducible, getNpmVersion } = require('../../_helper')

const projectRootPath = resolve(__dirname, '..', '..', '..')
const projectTestRootPath = join(projectRootPath, 'tests')
const demoRootPath = join(projectRootPath, 'demo')

const cliWrapper = join(projectRootPath, 'bin', 'cyclonedx-npm-cli.js')

/* we run only the latest most advanced */
const latestCdxSpecVersion = Spec.Version.v1dot6

describe('integration.demos', () => {
  const skipAllTests = getNpmVersion()[0] < 8

  const UPDATE_SNAPSHOTS = !!process.env.CNPM_TEST_UPDATE_SNAPSHOTS
  const cliRunTestTimeout = 15000

  const tmpRoot = mkdtempSync(join(projectTestRootPath, '_tmp', 'CDX-IT-Demos-CLI.run.'))

  const demos = [
    'alternative-package-registry',
    'bundled-dependencies',
    'dev-dependencies',
    // 'juice-shop',
    'local-dependencies',
    'local-workspaces',
    'package-integrity',
    'package-with-build-id'
  ]
  const formats = ['json', 'xml']

  const demoResultsRoot = resolve(projectTestRootPath, '_data', 'sbom_demo-results')

  /**
   * @param {string} demo
   * @param {'bare'|'flat'} oType
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
        '--validate',
        join(demoRootPath, demo, 'project')
      ], {
        stdio: ['inherit', 'inherit', 'pipe'],
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
            runTest(demo, 'flat', format, ['--flatten-components'])
          }, cliRunTestTimeout)
        })
      }
    })
  }
})
