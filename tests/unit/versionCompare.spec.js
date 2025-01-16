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

const { describe, expect, test } = require('@jest/globals')

const { versionCompare } = require('../../dist/_helpers')

describe('versionCompare', () => {
  test.each([
    // region equal
    [[1], [1], 0],
    [[1, 0, 0], [1, 0, 0], 0],
    [[1, 0, 0], [1], 0],
    [[1], [1, 0, 0], 0],
    // endregion
    // region greater
    [[2], [1], +1],
    [[1, 0, 1], [1, 0, 0], +1],
    [[1, 0, 1], [1], +1],
    [[2], [1, 0, 0], +1],
    // endregion
    // region lower
    [[1], [2], -1],
    [[1, 0, 0], [1, 0, 1], -1],
    [[1, 0, 0], [2], -1],
    [[1], [1, 0, 1], -1]
    // endregion
  ])('%j VS %j => %j', (versionA, versionB, expected) => {
    const actual = versionCompare(versionA, versionB)
    expect(actual).toBe(expected)
  })
})
