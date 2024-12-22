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

const { Spec } = require('@cyclonedx/cyclonedx-library')
const { mkdtempSync } = require('fs')
const { join, resolve } = require('path')

const { createWriteStream, openSync } = require('fs')

const cli = require('../../dist/cli')

const projectRootPath = resolve(__dirname, '..', '..')
const projectTestRootPath = resolve(__dirname, '..')

const projectDemoRootPath = join(projectRootPath, 'demo')
const projectTestDataPath = join(projectTestRootPath, '_data')

const dummyProjectsRoot = join(projectTestDataPath, 'dummy_projects')
const demoResultsRoot = join(projectTestDataPath, 'sbom_demo-results')
const dummyResultsRoot = join(projectTestDataPath, 'sbom_dummy-results')
const npmLsReplacementPath = join(projectTestDataPath, 'npm-ls_replacement')

const npmLsReplacement = {
  brokenJson: join(npmLsReplacementPath, 'broken-json.js'),
  checkArgs: join(npmLsReplacementPath, 'check-args.js'),
  demoResults: join(npmLsReplacementPath, 'demo-results.js'),
  justExit: join(npmLsReplacementPath, 'just-exit.js'),
  nonExistingBinary: join(npmLsReplacementPath, 'aNonExistingBinary')
}

/* we might run only the latest most advanced */
const latestCdxSpecVersion = Spec.Version.v1dot6

const UPDATE_SNAPSHOTS = !!process.env.CNPM_TEST_UPDATE_SNAPSHOTS

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

const cliWrapper = join(projectRootPath, 'bin', 'cyclonedx-npm-cli.js')

/**
 * @param {string} caseName
 * @return {string}
 */
function mkTemp (caseName) {
  return mkdtempSync(join(projectTestRootPath, '_tmp', `CDX-IT-${caseName}.`))
}

module.exports = {
  UPDATE_SNAPSHOTS,
  latestCdxSpecVersion,
  projectRootPath,
  projectDemoRootPath,
  projectTestDataPath,
  demoResultsRoot,
  dummyResultsRoot,
  dummyProjectsRoot,
  npmLsReplacementPath,
  npmLsReplacement,
  runCLI,
  cliWrapper,
  mkTemp
}
