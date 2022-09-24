'use strict'
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

/**
 * @see {@link https://eslint.org/}
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  /** @see https://github.com/standard/ts-standard */
  extends: 'standard-with-typescript',
  parserOptions: {
    project: './tsconfig.json'
  },
  plugins: [
    'simple-import-sort'
  ],
  env: {
    commonjs: true,
    node: true
  },
  overrides: [
    {
      files: [
        '*.spec.*',
        '*.test.*'
      ],
      env: {
        jest: true,
        commonjs: true,
        node: true
      }
    }
  ],
  rules: {
    // region sort imports/exports
    /** disable other sorters in favour of `simple-import-sort` **/
    'import/order': 0,
    'sort-imports': 0,
    /** @see https://github.com/lydell/eslint-plugin-simple-import-sort/ */
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error'
    // endregion sort imports/exports
  }
}
