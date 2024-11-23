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

const { sync: glob } = require('fast-glob')

const fileGlob = '*/CI_results/*.json'

const filePattern = /\/(?<subject>[^/]+?)\/CI_results\/npm-ls(?<args>.*?)_npm(?<npm>.+?)_node(?<node>.+?)_(?<os>.+?).json$/i
/** @typedef fileMatch
 * @prop {string} path
 * @prop {string} subject
 * @prop {string} args
 * @prop {string} npm
 * @prop {string} node
 * @prop {string} os
 */

/** @type {import('fast-glob').OptionsInternal} */
const globOptions = { absolute: true, caseSensitiveMatch: false, cwd: __dirname, deep: 3, onlyFiles: true, unique: true }

let cached

/**
 * @return {Array<fileMatch>}
 */
function index () {
  if (cached === undefined) {
    cached = Object.freeze(
      glob(fileGlob, globOptions).sort().map(
        file => Object.freeze({
          ...(filePattern.exec(file)?.groups ?? {}),
          path: file
        })
      )
    )
  }
  return cached
}

module.exports = {
  index
}
