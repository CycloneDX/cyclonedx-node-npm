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

const { index: indexNpmLsDemoData } = require('../_data/npm-ls_demo-results')
const { makeReproducible } = require('../_helper')
const { UPDATE_SNAPSHOTS, mkTemp, dummyProjectsRoot, runCLI, latestCdxSpecVersion, demoResultsRoot, npmLsReplacement } = require('./')

describe('integration.cli.from-collected', () => {
  const cliRunTestTimeout = 15000

  const tmpRoot = mkTemp('cli.from-collected')

  describe('with prepared npm-ls', () => {
    const LATETS_NPM = '11'

    const tmpRootRun = join(tmpRoot, 'with-prepared')
    mkdirSync(tmpRootRun)

    const _allDemoCases = indexNpmLsDemoData()
    const useCases = [
      {
        subject: 'bare',
        args: [],
        demoCases: _allDemoCases
      },
      {
        subject: 'flatten-components',
        args: ['--flatten-components'],
        demoCases: _allDemoCases.filter((c) => {
          if (c.npm !== LATETS_NPM) { return false }
          if (c.subject === 'juice-shop') { return true }
          if (c.subject === 'bundled-dependencies') { return true }
          return false
        })
      }
    ]

    describe.each(useCases)('$subject', (ud) => {
      mkdirSync(join(tmpRootRun, ud.subject))

      test.each(ud.demoCases)('$subject $args npm$npm node$node $os', async (dd) => {
        const expectedOutSnap = join(demoResultsRoot, ud.subject, `${dd.subject}${dd.args}_npm${dd.npm}_node${dd.node}_${dd.os}.snap.json`)
        const logFileBase = join(tmpRootRun, ud.subject, `${dd.subject}${dd.args}_npm${dd.npm}_node${dd.node}_${dd.os}`)
        const cwd = dummyProjectsRoot

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
          // explicit args
          ...(dd.args === '' ? [] : dd.args.split(' ')),
          '--',
          // just some dummy project
          join('with-lockfile', 'package.json')
        ], logFileBase, cwd, {
          CT_VERSION: `${dd.npm}.99.0`,
          CT_SUBJECT: dd.subject,
          CT_ARGS: dd.args,
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
})
