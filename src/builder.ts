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

import { readFileSync } from 'fs'

import { Builders, Enums, Models } from '@cyclonedx/cyclonedx-library'

import { makeThisTool } from './thisTool'

interface BomBuilderOptions {
  metaComponentType: BomBuilder['metaComponentType']
  excludeDevDependencies: BomBuilder['excludeDevDependencies']
  reproducible: BomBuilder['reproducible']
}

export class BomBuilder {
  toolBuilder: Builders.FromPackageJson.ToolBuilder

  metaComponentType: Enums.ComponentType
  excludeDevDependencies: boolean
  reproducible: boolean

  constructor (
    toolBuilder: Builders.FromPackageJson.ToolBuilder,
    options: BomBuilderOptions
  ) {
    this.toolBuilder = toolBuilder
    this.metaComponentType = options.metaComponentType
    this.excludeDevDependencies = options.excludeDevDependencies
    this.reproducible = options.reproducible
  }

  buildFromPackageJson (lockFile: string): Models.Bom {
    const struct: any = JSON.parse(readFileSync(lockFile, { encoding: 'utf-8' }))

    let bom: Models.Bom
    switch (struct.lockfileVersion ?? 1) {
      case 1:
        bom = this.buildFromPackageJson1(struct)
        break
      case 2:
        bom = this.buildFromPackageJson2(struct)
        break
      default:
        throw new Error('unsupported lockfile version')
    }

    const thisTool = makeThisTool(this.toolBuilder)
    if (thisTool !== undefined) {
      bom.metadata.tools.add(thisTool)
    }

    if (!this.reproducible) {
      bom.metadata.timestamp = new Date()
    }

    return bom
  }

  private buildFromPackageJson1 (struct: any): Models.Bom {
    console.info(
      this.metaComponentType,
      this.excludeDevDependencies,
      this.reproducible,
      struct
    )

    return new Models.Bom(
      // @TODO
    )
  }

  private buildFromPackageJson2 (struct: any): Models.Bom {
    /*
    console.info(
      this.metaComponentType,
      this.excludeDevDependencies,
      this.reproducible,
      struct
    )
    */

    const bom = new Models.Bom()

    return bom
  }
}
