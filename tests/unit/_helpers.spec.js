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

const { getMimeForLicenseFile } = require('../../dist/_helpers')
const { describe, expect, test } = require('@jest/globals')

describe('getMimeForLicenseFile', () => {
  test.each([
    ['LICENCE', 'text/plain'],
    ['site.html', 'text/html'],
    ['license.md', 'text/markdown'],
    ['info.xml', 'text/xml'],
    ['UNKNOWN', 'text/plain'],
    ['LICENCE.MIT', 'text/plain']
  ])('check %s', (fileName, expected) => {
    const value = getMimeForLicenseFile(fileName)
    expect(value).toBe(expected)
  })
})
