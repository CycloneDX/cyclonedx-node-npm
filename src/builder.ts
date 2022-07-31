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

import { dirname } from 'path'
import { spawnSync } from 'child_process'

import { Builders, Enums, Factories, Models } from '@cyclonedx/cyclonedx-library'
import { PackageURL } from 'packageurl-js'

import { makeThisTool } from './thisTool'

interface BomBuilderOptions {
  metaComponentType: BomBuilder['metaComponentType']
  excludeDevDependencies: BomBuilder['excludeDevDependencies']
  reproducible: BomBuilder['reproducible']
}

export class BomBuilder {
  toolBuilder: Builders.FromPackageJson.ToolBuilder
  componentBuilder: Builders.FromPackageJson.ComponentBuilder
  purlFactory: Factories.PackageUrlFactory

  metaComponentType: Enums.ComponentType
  excludeDevDependencies: boolean
  reproducible: boolean

  constructor (
    toolBuilder: BomBuilder['toolBuilder'],
    componentBuilder: BomBuilder['componentBuilder'],
    purlFactory: BomBuilder['purlFactory'],
    options: BomBuilderOptions
  ) {
    this.toolBuilder = toolBuilder
    this.componentBuilder = componentBuilder
    this.purlFactory = purlFactory

    this.metaComponentType = options.metaComponentType
    this.excludeDevDependencies = options.excludeDevDependencies
    this.reproducible = options.reproducible
  }

  buildFromLockFile (filePath: string): Models.Bom {
    const prefix = dirname(filePath)
    const args = ['--prefix', prefix, 'ls', '--json', '--all', '--long', '--package-lock-only']
    if (this.excludeDevDependencies) {
      args.push('--omit', 'dev')
    }
    const npmLsReturns = spawnSync('npm', args, {
      encoding: 'utf8'
    })
    if (npmLsReturns.status !== 0) {
      throw new Error(`npm-ls exited with errors: ${npmLsReturns.status ?? '???'}\n${npmLsReturns.stderr}`)
    }
    if (npmLsReturns.stderr.length > 0) {
      console.error('npm-ls had errors:')
      console.group()
      console.error(npmLsReturns.stderr)
      console.groupEnd()
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

    bom.metadata.component = this.#makeComponent(struct, this.metaComponentType)

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

  /**
   * base64(on 512 bit) = 86 chars + 2 chars padding
   */
  #sha512RE = /\bsha512-(.{86}==)\b/i

  #makeComponent (data: any, type: Enums.ComponentType | undefined): Models.Component | undefined {
    const component = this.componentBuilder.makeComponent(data, type)
    if (component === undefined) {
      return component
    }

    // @TODO -- what to do with `extraneous` ?

    if (typeof data.resolved === 'string') {
      component.externalReferences.add(
        new Models.ExternalReference(
          Enums.ExternalReferenceType.Distribution,
          data.resolved
        )
      )
    }

    if (typeof data.integrity === 'string') {
      const hashSha512: string | undefined = (this.#sha512RE.exec(data.integrity) ?? [undefined])[1]
      if (typeof hashSha512 === 'string') {
        component.hashes.set(
          Enums.HashAlgorithm['SHA-512'],
          hashSha512 // @TODO convert from b64 to hex
        )
      }
    }

    component.purl = this.#makePurl(component)
    // @TODO component.bomRef.value =

    return component
  }

  #makePurl (component: Models.Component): PackageURL | undefined {
    const purl = this.purlFactory.makeFromComponent(component)
    if (purl === undefined) { return purl }

    // TODO need the nest release of the lib, to get the needed features ...

    /*
     * @TODO: detect non-standard registry (not "npmjs.org")
      const qualifiers: PackageURL['qualifiers'] = purl.qualifiers ?? {}
      qualifiers.repository_url = ...
     */

    return purl
  }
}
