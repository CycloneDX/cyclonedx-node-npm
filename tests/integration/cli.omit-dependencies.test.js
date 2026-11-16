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

const { mkdirSync, readFileSync } = require('node:fs')
const { join } = require('node:path')

const { describe, expect, test } = require('@jest/globals')

const { dummyProjectsRoot, latestCdxSpecVersion, mkTemp, npmLsReplacement, runCLI } = require('./')

describe('integration.cli.omit-dependencies', () => {
  const cliRunTestTimeout = 15000

  const tmpRoot = mkTemp('cli.omit-dependencies')

  async function runWithDemoFixture (subject, extraArgs, logName) {
    const logFileBase = join(tmpRoot, logName)
    const { res, outFile, errFile } = runCLI([
      '--output-reproducible',
      '--spec-version', `${latestCdxSpecVersion}`,
      '--output-format', 'JSON',
      '--package-lock-only',
      '--flatten-components',
      ...extraArgs,
      '--',
      join('with-lockfile', 'package.json')
    ], logFileBase, dummyProjectsRoot, {
      CT_VERSION: '10.99.0',
      CT_SUBJECT: subject,
      CT_ARGS: '',
      CT_NPM: '10',
      CT_NODE: '20',
      CT_OS: 'ubuntu-latest',
      npm_execpath: npmLsReplacement.demoResults
    })

    try {
      await expect(res).resolves.toBe(0)
    } catch (err) {
      process.stderr.write(readFileSync(errFile))
      throw err
    }

    const bom = JSON.parse(readFileSync(outFile, 'utf8'))
    return (bom.components || []).map(c => c.name).sort()
  }

  describe('omit-transitive', () => {
    mkdirSync(join(tmpRoot, 'omit-transitive'), { recursive: true })

    test.each([
      ['empty omit includes all packages', [], [
        'dedup-child',
        'dedup-shared',
        'dev-opt-leaf',
        'dev-tool',
        'extra-pkg',
        'prod-child',
        'prod-lib',
        'root-opt',
        'root-peer',
        'root-peer-opt',
        'shared-dev-opt',
        'trans-opt',
        'trans-peer'
      ]],
      ['omit dev retains devOptional packages', ['--omit=dev'], [
        'dedup-child',
        'dedup-shared',
        'dev-opt-leaf',
        'extra-pkg',
        'prod-child',
        'prod-lib',
        'root-opt',
        'root-peer',
        'root-peer-opt',
        'shared-dev-opt',
        'trans-opt',
        'trans-peer'
      ]],
      ['omit optional prunes transitive optional and peerOptional while retaining devOptional and deduped children', ['--omit=optional'], [
        'dedup-child',
        'dedup-shared',
        'dev-opt-leaf',
        'dev-tool',
        'extra-pkg',
        'prod-child',
        'prod-lib',
        'root-peer',
        'shared-dev-opt',
        'trans-peer'
      ]],
      ['omit dev and optional prunes dev, transitive optional, and devOptional', ['--omit=dev', '--omit=optional'], [
        'dedup-child',
        'dedup-shared',
        'extra-pkg',
        'prod-child',
        'prod-lib',
        'root-peer',
        'trans-peer'
      ]],
      ['omit peer prunes peer and peerOptional while preserving prod+peer dual-declared packages', ['--omit=peer'], [
        'dedup-child',
        'dedup-shared',
        'dev-opt-leaf',
        'dev-tool',
        'extra-pkg',
        'prod-child',
        'prod-lib',
        'root-opt',
        'shared-dev-opt',
        'trans-opt'
      ]],
      ['omit dev, optional, and peer prunes all optional/dev/peer packages', ['--omit=dev', '--omit=optional', '--omit=peer'], [
        'extra-pkg',
        'prod-child',
        'prod-lib'
      ]]
    ])('%s', async (_label, omitArgs, expectedNames) => {
      const names = await runWithDemoFixture('omit-transitive', omitArgs, `omit-transitive/${_label.replaceAll(/\W+/g, '_')}`)
      expect(names).toEqual(expectedNames)
    }, cliRunTestTimeout)
  })

  describe('omit-workspace-flags', () => {
    mkdirSync(join(tmpRoot, 'omit-workspace-flags'), { recursive: true })

    test('respects package-level flags and preserves workspace dev precedence', async () => {
      const omitPeer = await runWithDemoFixture('omit-workspace-flags', ['--omit=peer'], 'omit-workspace-flags/omit-peer')
      expect(omitPeer).toEqual([
        'flag-dev',
        'flag-dev-opt',
        'flag-opt',
        'pkg-a',
        'ws-dev-peer'
      ])

      const omitDevOpt = await runWithDemoFixture('omit-workspace-flags', ['--omit=dev', '--omit=optional'], 'omit-workspace-flags/omit-dev-opt')
      expect(omitDevOpt).toEqual([
        'flag-peer',
        'pkg-a'
      ])
    }, cliRunTestTimeout)
  })
})
