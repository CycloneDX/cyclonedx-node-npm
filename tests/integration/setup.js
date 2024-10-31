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
const { join } = require('path')
const { getNpmVersion } = require('../_helper')
const { projectDemoRootPath } = require('./');

(function () {
  // skipped for now
  return
  /* eslint-disable no-unreachable */

  const REQUIRES_INSTALL = []

  const npmVersion = getNpmVersion()

  /* region demos */

  // !! due to inconsistencies between npm6,7,8 -
  // some test beds might be skipped
  if (npmVersion[0] >= 8) {
    REQUIRES_INSTALL.push(
      join(projectDemoRootPath, 'alternative-package-registry', 'project'),
      join(projectDemoRootPath, 'bundled-dependencies', 'project'),
      // join(projectDemoRootPath, 'deps-from-git', 'project'),
      join(projectDemoRootPath, 'dev-dependencies', 'project'),
      // join(projectDemoRootPath, 'juice-shop', 'project'),
      join(projectDemoRootPath, 'local-dependencies', 'project'),
      join(projectDemoRootPath, 'local-workspaces', 'project'),
      join(projectDemoRootPath, 'package-integrity', 'project'),
      join(projectDemoRootPath, 'package-with-build-id', 'project')
    )
  }
  /* endregion demos */

  console.warn(`
  WILL SETUP TEST BEDS
  THAT MIGHT CONTAIN OUTDATED VULNERABLE PACKAGES
  FOR SHOWCASING AND TESTING PURPOSES ONLY.
  `)

  process.exitCode = 0

  for (const DIR of REQUIRES_INSTALL) {
    console.log('>>> setup with npm:', DIR)
    const done = spawnSync(
      'npm', ['install', '--ignore-scripts'], {
        cwd: DIR,
        stdio: 'inherit',
        shell: true
      }
    )
    if (done.status !== 0) {
      ++process.exitCode
      console.error(done)
    }
  }
})()
