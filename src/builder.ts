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

import { basename } from 'path'
import { spawnSync } from 'child_process'

import { Builders, Enums, Models } from '@cyclonedx/cyclonedx-library'

import { makeThisTool } from './thisTool'

interface BomBuilderOptions {
  metaComponentType: BomBuilder['metaComponentType']
  excludeDevDependencies: BomBuilder['excludeDevDependencies']
  reproducible: BomBuilder['reproducible']
}

export class BomBuilder {
  toolBuilder: Builders.FromPackageJson.ToolBuilder
  componentBuilder: Builders.FromPackageJson.ComponentBuilder

  metaComponentType: Enums.ComponentType
  excludeDevDependencies: boolean
  reproducible: boolean

  constructor (
    toolBuilder: BomBuilder['toolBuilder'],
    componentBuilder: BomBuilder['componentBuilder'],
    options: BomBuilderOptions
  ) {
    this.toolBuilder = toolBuilder
    this.componentBuilder = componentBuilder

    this.metaComponentType = options.metaComponentType
    this.excludeDevDependencies = options.excludeDevDependencies
    this.reproducible = options.reproducible
  }

  buildFromLockFile (filePath: string): Models.Bom {
    const prefix = basename(filePath)
    const args = ['--prefix', prefix, 'ls', '--json', '--all', '--long']
    if (this.excludeDevDependencies) {
      args.push('--omit', 'dev')
    }
    const npmLsReturns = spawnSync('npm', args, {
      encoding: 'utf8'
    })
    if (npmLsReturns.stderr.length > 0) {
      console.error('npm ls had errors:\n', npmLsReturns.stderr)
    }
    if (npmLsReturns.status !== 0) {
      throw new Error(`npm ls exited unexpectedly: ${npmLsReturns.status ?? '???'}`)
    }

    let struct: any
    try {
      struct = JSON.parse(npmLsReturns.stdout)
    } catch (jsonParseError) {
      throw new Error('failed to parse $npmLsReturns')
    }

    return this.buildFromNpmLs(struct)
  }

  buildFromNpmLs (struct: any): Models.Bom {
    const bom = new Models.Bom()

    // region metadata

    // @FIXME build from this data source does not hold all references and such ...
    bom.metadata.component = this.componentBuilder.makeComponent(struct, this.metaComponentType)

    const thisTool = makeThisTool(this.toolBuilder)
    if (thisTool !== undefined) {
      bom.metadata.tools.add(thisTool)
    }

    if (!this.reproducible) {
      bom.metadata.timestamp = new Date()
    }

    // endregion metadata

    return bom
  }
}
