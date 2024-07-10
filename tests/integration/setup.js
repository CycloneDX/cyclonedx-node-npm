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
const path = require('path')
const { getNpmVersion } = require('../_helper')

const projectRootPath = path.resolve(__dirname, '..', '..')
const demoRootPath = path.resolve(projectRootPath, 'demo');

(function () {
  const REQUIRES_INSTALL = []

  const npmVersion = getNpmVersion()

  /* region demos */

  if (npmVersion[0] >= 8) {
    REQUIRES_INSTALL.push(
      path.join(demoRootPath, 'alternative-package-registry', 'project'),
      path.join(demoRootPath, 'bundled-dependencies', 'project'),
      path.join(demoRootPath, 'dev-dependencies', 'project'),
      // path.join(demoRootPath, 'juice-shop', 'project'),
      path.join(demoRootPath, 'local-dependencies', 'project'),
      path.join(demoRootPath, 'local-workspaces', 'project'),
      path.join(demoRootPath, 'package-integrity', 'project'),
      path.join(demoRootPath, 'package-with-build-id', 'project')
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
