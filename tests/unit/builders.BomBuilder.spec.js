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

const { Models, Builders, Factories } = require('@cyclonedx/cyclonedx-library')
const fs = require('fs')
const { BomBuilder, TreeBuilder } = require('../../dist/builders')
const { jest, describe, expect, it } = require('@jest/globals')

describe('BomBuilder', () => {
  const extRefFactory = new Factories.FromNodePackageJson.ExternalReferenceFactory()
  const bomBuilder = new BomBuilder(
    new Builders.FromNodePackageJson.ToolBuilder(extRefFactory),
    new Builders.FromNodePackageJson.ComponentBuilder(
      extRefFactory,
      new Factories.LicenseFactory()
    ),
    new TreeBuilder(),
    new Factories.FromNodePackageJson.PackageUrlFactory('npm'),
    {
      ignoreNpmErrors: true,
      metaComponentType: true,
      packageLockOnly: true,
      omitDependencyTypes: [],
      reproducible: true,
      flattenComponents: true,
      shortPURLs: true,
      gatherLicenseTexts: true
    },
    null
  )
  describe('License fetching', () => {
    it('fetches existing license from directory', async () => {
      const fsMock = jest.spyOn(fs, 'readdirSync')
      const fileMock = jest.spyOn(fs, 'readFileSync')
      fsMock.mockReturnValue(['license.txt'])
      fileMock.mockReturnValue('license file content')
      const licenses = bomBuilder.fetchLicenseEvidence('test_module')
      const license = licenses.next().value
      expect(license).toBeInstanceOf(Models.NamedLicense)
      expect(license.name).toBe('file: license.txt')
      expect(license.text.contentType).toBe('text/plain')
      expect(license.text.encoding).toBe('base64')
      expect(license.text.content).toBe('license file content')
    })
    it('fetches nothing from directory', async () => {
      const fsMock = jest.spyOn(fs, 'readdirSync')
      fsMock.mockReturnValue(['nothing.txt'])
      const licenses = bomBuilder.fetchLicenseEvidence('test_module')
      const license = licenses.next().value
      expect(license).toBeFalsy()
    })
  })
})
