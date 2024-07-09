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

const { makeReproducible } = require('../../_helper')

const projectRootPath = join(__dirname, '..', '..', '..')
const projectTestRootPath = join(projectRootPath, 'tests')
const demoRootPath = resolve(projectRootPath, 'demo')

const cliWrapper = join(projectRootPath, 'bin', 'cyclonedx-npm-cli.js')

describe('integration.demos', () => {
  const UPDATE_SNAPSHOTS = true // !!process.env.CNPM_TEST_UPDATE_SNAPSHOTS
  const cliRunTestTimeout = 15000

  const tmpRoot = mkdtempSync(join(projectTestRootPath, '_log', 'CDX-IT-Demos-CLI.run.'))

  const demos = [
    'alternative-package-registry',
    'bundled-dependencies',
    'dev-dependencies',
    'juice-shop',
    'local-dependencies',
    'local-workspaces',
    'package-integrity',
    'package-with-build-id'
  ]
  const formats = ['JSON', 'XML']
  const specs = ['1.6', '1.5', '1.4', '1.3', '1.2']

  for (const demo of demos) {
    describe(`demo: ${demo}`, () => {
      const projectRootPath = join(demoRootPath, demo, 'project')
      const resBareDir = join(demoRootPath, demo, 'example-results', 'bare')
      const resFlatDir = join(demoRootPath, demo, 'example-results', 'flat')

      for (const format of formats) {
        describe(`format: ${format}`, () => {
          for (const spec of specs) {
            describe(`spec: ${spec}`, () => {
              const resFileName = `bom.${spec}.${format.toLowerCase()}`

              test('bare', () => {
                const expectedFile = join(resBareDir, resFileName)
                const outFile = join(tmpRoot, `${demo}_bare_${resFileName}`)
                const res = spawnSync(
                  process.execPath,
                  ['--', cliWrapper,
                    '--spec-version', spec,
                    '--output-format', format,
                    '--output-reproducible',
                    '--validate',
                    '--output-file', outFile
                  ], {
                    cwd: projectRootPath,
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
                const actualOutput = makeReproducible(format.toLowerCase(), readFileSync(outFile, 'utf8'))

                if (UPDATE_SNAPSHOTS) {
                  writeFileSync(expectedFile, actualOutput, 'utf8')
                }

                expect(actualOutput).toEqual(
                  readFileSync(expectedFile, 'utf8'),
                  `${outFile} should equal ${expectedFile}`
                )
              }, cliRunTestTimeout)

              test('flat', () => {
                const expectedFile = join(resFlatDir, resFileName)
                const outFile = join(tmpRoot, `${demo}_flat_${resFileName}`)
                const res = spawnSync(
                  process.execPath,
                  ['--', cliWrapper,
                    '--flatten-components',
                    '--spec-version', spec,
                    '--output-format', format,
                    '--output-reproducible',
                    '--validate',
                    '--output-file', outFile
                  ], {
                    cwd: projectRootPath,
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
                const actualOutput = makeReproducible(format.toLowerCase(), readFileSync(outFile, 'utf8'))

                if (UPDATE_SNAPSHOTS) {
                  writeFileSync(expectedFile, actualOutput, 'utf8')
                }

                expect(actualOutput).toEqual(
                  readFileSync(expectedFile, 'utf8'),
                  `${outFile} should equal ${expectedFile}`
                )
              }, cliRunTestTimeout)
            })
          }
        })
      }
    })
  }
})
