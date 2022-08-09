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
import { PropertyNames, PropertyValueBool } from './properties'

interface BomBuilderOptions {
  metaComponentType?: BomBuilder['metaComponentType']
  packageLockOnly?: BomBuilder['packageLockOnly']
  omitDependencyTypes?: BomBuilder['omitDependencyTypes']
  reproducible?: BomBuilder['reproducible']
  flattenComponents?: BomBuilder['flattenComponents']
}

interface spawnSyncResultError {
  errno?: number
  code?: string
  signal?: NodeJS.Signals
}

type cPath = string
type AllComponents = Map<cPath, Models.Component>

export class BomBuilder {
  toolBuilder: Builders.FromNodePackageJson.ToolBuilder
  componentBuilder: Builders.FromNodePackageJson.ComponentBuilder
  purlFactory: Factories.PackageUrlFactory

  metaComponentType: Enums.ComponentType | undefined
  packageLockOnly: boolean
  omitDependencyTypes: string[]
  reproducible: boolean
  flattenComponents: boolean

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
    this.packageLockOnly = options.packageLockOnly ?? false
    this.omitDependencyTypes = options.omitDependencyTypes ?? []
    this.reproducible = options.reproducible ?? false
    this.flattenComponents = options.flattenComponents ?? true // @TODO default to false

    this.console = console_
  }

  buildFromLockFile (filePath: string): Models.Bom {
    return this.buildFromNpmLs(
      this.#fetchNpmLs(
        dirname(filePath)
      )
    )
  }

  #fetchNpmLs (projectDir: string): any {
    // `npm_execpath` is used by `npm` internally, and is propagated when kicking `npm run-script`
    /* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions -- need to handle optional empty-string */
    const command = process.env.npm_execpath || 'npm'

    const args = [
      'ls',
      // format as parsable json
      '--json',
      // depth = infinity
      '--all',
      // get all the needed content
      '--long'
    ]
    if (this.packageLockOnly) {
      args.push('--package-lock-only')
    }
    for (const odt of this.omitDependencyTypes) {
      args.push('--omit', odt)
    }

    // TODO use instead ? : https://www.npmjs.com/package/debug ?
    this.console.debug('gather dependency tree ...', command, args)
    const npmLsReturns = spawnSync(command, args, {
      cwd: projectDir,
      encoding: 'buffer',
      maxBuffer: Number.POSITIVE_INFINITY // DIRTY but effective
    })
    if (npmLsReturns.error instanceof Error) {
      const error = npmLsReturns.error as spawnSyncResultError
      throw new Error(`npm-ls exited with errors: ${
        error.errno ?? '???'} ${
        error.code ?? npmLsReturns.status ?? 'noCode'} ${
        error.signal ?? npmLsReturns.signal ?? 'noSignal'}`)
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
    // TODO use instead ? : https://www.npmjs.com/package/debug ?
    this.console.debug('build BOM ...')

    // region all components & dependencies

    const rootComponent = this.#makeComponent(data, this.metaComponentType) ??
      new DummyComponent(Enums.ComponentType.Library, 'RootComponent')
    const allComponents: AllComponents = new Map([[data.path, rootComponent]])
    this.#gatherDependencies(allComponents, data, rootComponent.dependencies)

    // endregion all components & dependencies

    const bom = new Models.Bom()

    // region metadata

    bom.metadata.component = rootComponent

    const thisTool = makeThisTool(this.toolBuilder)
    if (thisTool !== undefined) {
      bom.metadata.tools.add(thisTool)
    }

    if (!this.reproducible) {
      bom.metadata.timestamp = new Date()
    }

    // endregion metadata

    // region components

    if (this.flattenComponents) {
      for (const component of allComponents.values()) {
        bom.components.add(component)
      }
    } else {
      // @TODO proper nesting
      /* // also reflect the `inBundle ?? _inBundle` marker`
          if ((data.inBundle ?? data._inBundle) === true) {
            component.properties.add(
              new Models.Property(PropertyNames.PackageBundled, PropertyValueBool.True)
            )
          }
       */

      bom.components = rootComponent.components
      rootComponent.components = new Models.ComponentRepository()
    }
    bom.components.delete(rootComponent)
    rootComponent.components.clear()

    // endregion components

    return bom
  }

  #gatherDependencies (allComponents: AllComponents, data: any, directDepRefs: Set<Models.BomRef>): void {
    // one and the same component may appear multiple times in the tree
    // but only one occurrence has all the direct dependencies.
    for (const [depName, depData] of Object.entries(data.dependencies ?? {}) as any) {
      if (depData === null || typeof depData !== 'object') {
        continue
      }
      if (typeof depData.path !== 'string') {
        // might be an optional dependency that was not installed
        continue
      }
      let dep = allComponents.get(depData.path)
      if (dep === undefined) {
        dep = this.#makeComponent(
          this.packageLockOnly
            ? depData
            : this.#enhancedPackageData(depData)
        ) ?? new DummyComponent(Enums.ComponentType.Library, `InterferedDependency.${depName as string}`)
        allComponents.set(depData.path, dep)
      }
      directDepRefs.add(dep.bomRef)
      this.#gatherDependencies(allComponents, depData, dep.dependencies)
    }
  }

  /**
   * Some combinations/versions of `npm-install`/`npm-ls` are insufficient,
   * they fail to load package details or miss details.
   * So here is a poly-fill that loads ALL the package's data.
   */
  #enhancedPackageData (data: { path: string }): any {
    try {
      return Object.assign(
        /* eslint-disable-next-line @typescript-eslint/no-var-requires */
        require(`${data.path}/package.json`),
        data
      )
    } catch {
      return data
    }
  }

  /**
   * base64 over 512 bit => 86 chars + 2 chars padding
   */
  #hashRE_sha512_base64 = /\bsha512-([a-z0-9+/]{86}==)\b/i

  /**
   * Ignore pattern for `resolved`.
   * - ignore: well, just ignore it ... i guess.
   * - file: local dist cannot be shipped and therefore should be ignored.
   */
  #resolvedRE_ignore = /^(?:ignore|file):/i

  #makeComponent (data: any, type?: Enums.ComponentType | undefined): Models.Component | undefined {
    const component = this.componentBuilder.makeComponent(data, type)
    if (component === undefined) {
      return component
    }

    if (data.extraneous === true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackageExtraneous, PropertyValueBool.True)
      )
    }

    if (data.private === true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackagePrivate, PropertyValueBool.True)
      )
    }

    if (typeof data.resolved === 'string' && !this.#resolvedRE_ignore.test(data.resolved)) {
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

    // even non-public packages may have a PURL for identification
    component.purl = this.#makePurl(component)

    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- since empty-string handling is needed */
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

    /* @TODO: detect non-standard registry (not "npmjs.org")
       const qualifiers: PackageURL['qualifiers'] = purl.qualifiers ?? {}
       qualifiers.repository_url = ...
     */

    return purl
  }
}

class DummyComponent extends Models.Component {
  constructor (type: Models.Component['type'], name: Models.Component['name']) {
    super(type, `DummyComponent.${name}`, {
      bomRef: `DummyComponent.${name}`,
      description: `Dummy component "${name}" to fill in the place where the actual built failed.`
    })
  }
}
