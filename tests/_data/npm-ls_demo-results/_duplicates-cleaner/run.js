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

"use strict";

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, statSync, createReadStream, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir_demo_res = dirname(__dirname)

const FNAME_pattern = /npm-ls_npm(?<npm>\d+)_node(?<node>\d+)_(?<os>.+)\.json/

/** @type {Object.<string, Object.<string, string[]>>} */
const files = {}

// /CI_results/npm-ls_npm6_node14_macos-latest.json
for (const dir_demo_res_e of readdirSync(dir_demo_res)) {
  const dir_results = join(dir_demo_res, dir_demo_res_e, 'CI_results')
  try {
    for (const dir_results_e of readdirSync(dir_results)) {
      const fname_match = FNAME_pattern.exec(dir_results_e)
      if (!fname_match) {
        continue
      }
      if (!Object.hasOwn(files, fname_match.groups.npm)) {
        files[fname_match.groups.npm] = {}
      }
      if (!Object.hasOwn(files[fname_match.groups.npm], fname_match.groups.os)) {
        files[fname_match.groups.npm][fname_match.groups.os] = []
      }
      files[fname_match.groups.npm][fname_match.groups.os].push(
        join(dir_results, dir_results_e)
      )
    }
  } catch (e) {
    continue
  }
}

for (const [npm, npm_files] of Object.entries(files)) {
  for (const [os, npm_os_files] of Object.entries(npm_files)) {
    const npm_os_file_hashes = new Set()
    for (const npm_os_file of npm_os_files) {
      const npm_os_file_hash = await fileHash(npm_os_file)
        if (npm_os_file_hashes.has(npm_os_file_hash)) {
          console.info('DELETE:', npm_os_file_hash, npm_os_file)
          unlinkSync(npm_os_file)
        }
        console.info('KEEP:', npm_os_file_hash, npm_os_file)
    }
  }
}


/**
 * @param {string} fp
 * @return {Promise<string>}
 */
function fileHash(fp) {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5');
    createReadStream(fp)
      .once('error', reject)
      .once('end', () => {
        resolve(hash.end().read().toString('hex'));
      })
      .pipe(hash);
  })
}
