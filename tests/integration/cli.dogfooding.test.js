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

const { describe, expect, test } = require('@jest/globals')

const { projectRootPath, cliWrapper } = require('./')

describe('integration.cli.dogfooding', () => {
  const cliRunTestTimeout = 15000

  test.each(['JSON', 'XML'])('dogfooding %s', (format) => {
    const res = spawnSync(
      process.execPath,
      ['--', cliWrapper, '--output-format', format, '--ignore-npm-errors'],
      {
        cwd: projectRootPath,
        stdio: ['ignore', 'inherit', 'pipe'],
        encoding: 'utf8'
      }
    )
    try {
      expect(res.error).toBeUndefined()
      expect(res.status).toBe(0)
    } catch (err) {
      process.stderr.write('\n')
      process.stderr.write(res.stderr)
      process.stderr.write('\n')
      throw err
    }
  }, cliRunTestTimeout)
})
