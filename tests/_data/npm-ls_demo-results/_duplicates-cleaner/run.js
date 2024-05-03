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

'use strict'

import { createHash } from 'node:crypto'
import { createReadStream, readdirSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dirDemoRes = dirname(__dirname)

const fnamePattern = /^npm-ls_npm(?<npm>\d+)_node(?<node>\d+)_(?<os>.+)\.json$/

/** @type {Object.<string, Object.<string, string[]>>} */
const files = {}

// /CI_results/npm-ls_npm6_node14_macos-latest.json
for (const dirDemoResE of readdirSync(dirDemoRes)) {
  const dirResults = join(dirDemoRes, dirDemoResE, 'CI_results')
  try {
    for (const dirResultsE of readdirSync(dirResults)) {
      const fnameMatch = fnamePattern.exec(dirResultsE)
      if (!fnameMatch) {
        continue
      }
      if (!Object.hasOwn(files, fnameMatch.groups.npm)) {
        files[fnameMatch.groups.npm] = {}
      }
      if (!Object.hasOwn(files[fnameMatch.groups.npm], fnameMatch.groups.os)) {
        files[fnameMatch.groups.npm][fnameMatch.groups.os] = []
      }
      files[fnameMatch.groups.npm][fnameMatch.groups.os].push(
        join(dirResults, dirResultsE)
      )
    }
  } catch (e) {
    continue
  }
}

for (const filesByOs of Object.values(files)) {
  for (const filePaths of filesByOs) {
    const fileHashes = new Set()
    for (const filePath of Object.values(filePaths)) {
      const fileHash = await hashFile(filePath)
      if (fileHashes.has(fileHash)) {
        console.info('DELETE:', fileHash, filePath)
        unlinkSync(filePath)
      }
      console.info('KEEP:', fileHash, filePath)
    }
  }
}

/**
 * @param {string} fp
 * @return {Promise<string>}
 */
function hashFile (fp) {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5')
    createReadStream(fp)
      .once('error', reject)
      .once('end', () => {
        resolve(hash.end().read().toString('hex'))
      })
      .pipe(hash)
  })
}
