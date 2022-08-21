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

const {Factories, Builders} = require("@cyclonedx/cyclonedx-library");
const { index: indexNpmLsDemoData} = require('../_data/npm-ls_demo-results')

const { BomBuilder, TreeBuilder } = require('../../dist/builders')
const { thisVersion } = require('../../package.json').version


describe('builders.BomBuilder', () => {

  const extRefFactory = new Factories.FromNodePackageJson.ExternalReferenceFactory()
  const builder = new BomBuilder(
    new Builders.FromNodePackageJson.ToolBuilder(extRefFactory),
    new Builders.FromNodePackageJson.ComponentBuilder(
      extRefFactory,
      new Factories.LicenseFactory()
    ),
    new TreeBuilder(),
    new Factories.PackageUrlFactory('npm'),
    {
      metaComponentType: 'application',
      packageLockOnly: true,
      omitDependencyTypes: [],
      reproducible: true,
      flattenComponents: false,
    },
    new console.Console(process.stderr, process.stderr)
  )

  describe('buildFromNpmLs', () => {
    test.each(
      indexNpmLsDemoData()
    )('%p', dd => {
      const bom = builder.buildFromNpmLs(dd.path)

      expect(bom.metadata.tools[0].version).toBe(thisVersion)
      bom.metadata.tools[0].version = undefined // ignore it from later tests

      // TODO match bom against a well-known result - either in JSON or XML rendered.
    })
  })
})
