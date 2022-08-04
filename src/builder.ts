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
import { PropertyNames } from './properties'

interface BomBuilderOptions {
  metaComponentType: BomBuilder['metaComponentType']
  excludeDevDependencies: BomBuilder['excludeDevDependencies']
  reproducible: BomBuilder['reproducible']
}

interface spawnSyncResultError {
  errno?: number
  code?: string
  signal?: NodeJS.Signals
}

type cPath = any
type AllComponents = Map<cPath, Models.Component | undefined>

export class BomBuilder {
  toolBuilder: Builders.FromNodePackageJson.ToolBuilder
  componentBuilder: Builders.FromNodePackageJson.ComponentBuilder
  purlFactory: Factories.PackageUrlFactory

  metaComponentType: Enums.ComponentType
  excludeDevDependencies: boolean
  reproducible: boolean

  console: Console

  constructor (
    toolBuilder: BomBuilder['toolBuilder'],
    componentBuilder: BomBuilder['componentBuilder'],
    purlFactory: BomBuilder['purlFactory'],
    options: BomBuilderOptions,
    console_: BomBuilder['console']
  ) {
    this.toolBuilder = toolBuilder
    this.componentBuilder = componentBuilder
    this.purlFactory = purlFactory

    this.metaComponentType = options.metaComponentType
    this.excludeDevDependencies = options.excludeDevDependencies
    this.reproducible = options.reproducible

    this.console = console_
  }

  buildFromLockFile (filePath: string): Models.Bom {
    return this.buildFromNpmLs(
      this.#fetchNpmLs(
        dirname(filePath)
      )
    )
  }

  #fetchNpmLs (prefix: string): any {
    const args = [
      '--prefix', prefix,
      'ls',
      '--json',
      '--all',
      '--long'
      /* '--package-lock-only'
      * @TODO thing about this param ...
      * best would be to analyse the actual existing node_modules dir ... but this mght be not a good idea ...
      * help text:
      *     If set to true, the current operation will only use the package-lock.json, ignoring node_modules.
      *     For update this means only the package-lock.json will be updated, instead of checking node_modules and downloading dependencies.
      *     For list this means the output will be based on the tree described by the package-lock.json, rather than the contents of node_modules.
      */
    ]
    if (this.excludeDevDependencies) {
      args.push('--omit', 'dev')
    }
    const npmLsReturns = spawnSync('npm', args, {
      encoding: 'buffer',
      maxBuffer: Number.POSITIVE_INFINITY // DIRTY but effective
    })
    if (npmLsReturns.error instanceof Error) {
      const error = npmLsReturns.error as spawnSyncResultError
      throw new Error(`npm-ls exited with errors: ${
        error.errno ?? '???'} ${
        error.code ?? npmLsReturns.status ?? 'noCode'} ${
        error.signal ?? npmLsReturns.signal ?? 'noSignal'}`)
      // @TODO typescript 4.8 - append the prev error to  `Error` as `{ cause: npmLsReturns.error }`
    }
    if (npmLsReturns.stderr.length > 0) {
      this.console.group('npm-ls had errors')
      this.console.debug(npmLsReturns.stderr.toString())
      this.console.groupEnd()
    }

    try {
      return JSON.parse(npmLsReturns.stdout.toString())
    } catch (jsonParseError: any) {
      throw new Error('failed to parse $npmLsReturns')
    }
  }

  buildFromNpmLs (data: any): Models.Bom {
    // region all components

    const allComponents: AllComponents = new Map([[data.path, this.#makeComponent(data)]])
    this.#gatherDependencies(allComponents, data)

    // endregion all components

    const bom = new Models.Bom()

    // region metadata

    bom.metadata.component = allComponents.get(data.path)

    const thisTool = makeThisTool(this.toolBuilder)
    if (thisTool !== undefined) {
      bom.metadata.tools.add(thisTool)
    }

    if (!this.reproducible) {
      bom.metadata.timestamp = new Date()
    }

    // endregion metadata

    for (const component of allComponents.values()) {
      if (component === bom.metadata.component) {
        continue // for ... of ...
      }
      if (component === undefined) {
        continue // for ... of ...
      }
      bom.components.add(component)
    }

    // @TODO bundled components - proper nesting
    // @TODO dependencies

    return bom
  }

  #gatherDependencies (allComponents: AllComponents, data: any): void {
    for (const dependency of Object.values(data.dependencies ?? {}) as any) {
      if (dependency === null || typeof dependency !== 'object') { continue }
      if (allComponents.has(dependency.path)) {
        continue
      }
      allComponents.set(dependency.path, this.#makeComponent(dependency))
      this.#gatherDependencies(allComponents, dependency)
    }
  }

  /**
   * base64(on 512 bit) = 86 chars + 2 chars padding
   */
  #hashRE_sha512_base64 = /\bsha512-([a-z0-9+/]{86}==)\b/i

  #makeComponent (data: any, type?: Enums.ComponentType | undefined): Models.Component | undefined {
    const component = this.componentBuilder.makeComponent(data, type)
    if (component === undefined) {
      return component
    }

    if (data.extraneous === true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackageExtraneous, 'true')
      )
    }

    if (data.private === true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackagePrivate, 'true')
      )
    }

    if (typeof data.resolved === 'string') {
      component.externalReferences.add(
        new Models.ExternalReference(
          Enums.ExternalReferenceType.Distribution,
          data.resolved
        )
      )
    }

    if (typeof data.integrity === 'string') {
      const hashSha512Match = this.#hashRE_sha512_base64.exec(data.integrity) ?? []
      if (hashSha512Match?.length === 2) {
        component.hashes.set(
          Enums.HashAlgorithm['SHA-512'],
          Buffer.from(hashSha512Match[1], 'base64').toString('hex')
        )
      }
    }

    component.purl = this.#makePurl(component)

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- since empty-string handling is needed
    component.bomRef.value = (typeof data._id === 'string' ? data._id : undefined) ||
      component.purl?.toString() ||
      `${data.name as string}@${data.version as string}`

    return component
  }

  #makePurl (component: Models.Component): PackageURL | undefined {
    const purl = this.purlFactory.makeFromComponent(component, this.reproducible)
    if (purl === undefined) {
      return purl
    }

    /*
     * @TODO: detect non-standard registry (not "npmjs.org")
      const qualifiers: PackageURL['qualifiers'] = purl.qualifiers ?? {}
      qualifiers.repository_url = ...
     */

    return purl
  }
}
