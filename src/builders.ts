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

/* eslint-disable max-lines -- ack */

import { existsSync } from 'node:fs'
import path from 'node:path'

import { type Builders, Enums, type Factories, Models, Utils } from '@cyclonedx/cyclonedx-library'
import normalizePackageJson from 'normalize-package-data'

import {
  isString, iteratorMap,
  loadJsonFile,
  structuredClonePolyfill,
  tryRemoveSecretsFromUrl
} from './_helpers'
import { PropertyNames, PropertyValueBool } from './cdx'
import type { NpmRunner } from './npmRunner'

type OmittableDependencyTypes = 'dev' | 'optional' | 'peer'

interface BomBuilderOptions {
  ignoreNpmErrors?: BomBuilder['ignoreNpmErrors']
  metaComponentType?: BomBuilder['metaComponentType']
  packageLockOnly?: BomBuilder['packageLockOnly']
  omitDependencyTypes?: Iterable<OmittableDependencyTypes>
  reproducible?: BomBuilder['reproducible']
  flattenComponents?: BomBuilder['flattenComponents']
  shortPURLs?: BomBuilder['shortPURLs']
  gatherLicenseTexts?: BomBuilder['gatherLicenseTexts']
  workspace?: BomBuilder['workspace']
  includeWorkspaceRoot?: BomBuilder['includeWorkspaceRoot']
  workspaces?: BomBuilder['workspaces']
}

type PackagePath = string
interface PackageData {
  name: string
  version: string
  resolved?: string
  integrity?: string
  license?: string
}


export class BomBuilder {
  npmRunner: NpmRunner
  componentBuilder: Builders.FromNodePackageJson.ComponentBuilder
  leGatherer: Utils.LicenseUtility.LicenseEvidenceGatherer
  treeBuilder: TreeBuilder
  purlFactory: Factories.FromNodePackageJson.PackageUrlFactory

  ignoreNpmErrors: boolean

  metaComponentType: Enums.ComponentType
  packageLockOnly: boolean
  omitDependencyTypes: Set<OmittableDependencyTypes>
  reproducible: boolean
  flattenComponents: boolean
  shortPURLs: boolean
  gatherLicenseTexts: boolean
  workspace: string[]
  includeWorkspaceRoot?: boolean
  workspaces?: boolean

  console: Console

  /* eslint-disable-next-line @typescript-eslint/max-params -- ack */
  constructor (
    npmRunner: NpmRunner,
    componentBuilder: BomBuilder['componentBuilder'],
    treeBuilder: BomBuilder['treeBuilder'],
    purlFactory: BomBuilder['purlFactory'],
    leFetcher: BomBuilder['leGatherer'],
    options: BomBuilderOptions,
    console_: BomBuilder['console']
  ) {
    this.npmRunner = npmRunner
    this.componentBuilder = componentBuilder
    this.treeBuilder = treeBuilder
    this.purlFactory = purlFactory
    this.leGatherer = leFetcher

    this.ignoreNpmErrors = options.ignoreNpmErrors ?? false
    this.metaComponentType = options.metaComponentType ?? Enums.ComponentType.Library
    this.packageLockOnly = options.packageLockOnly ?? false
    this.omitDependencyTypes = new Set(options.omitDependencyTypes ?? [])
    this.reproducible = options.reproducible ?? false
    this.flattenComponents = options.flattenComponents ?? false
    this.shortPURLs = options.shortPURLs ?? false
    this.gatherLicenseTexts = options.gatherLicenseTexts ?? false
    this.workspace = options.workspace ?? []
    this.includeWorkspaceRoot = options.includeWorkspaceRoot
    this.workspaces = options.workspaces

    this.console = console_
  }

  buildFromProjectDir (projectDir: string, process_: NodeJS.Process): Models.Bom {
    return this.buildFromNpmLs(
      this.fetchNpmLs(projectDir, process_),
      this.npmRunner.getVersion({ env: process_.env })
    )
  }

  private fetchNpmLs (projectDir: string, process_: NodeJS.Process): any {
    const args: string[] = [
      'ls',
      // format as parsable json
      '--json',
      // get all the needed content
      '--long',
      // depth = infinity
      '--all'
    ]

    if (this.packageLockOnly) {
      args.push('--package-lock-only')
    }

    // since NPM v8.7 -- https://github.com/npm/cli/pull/4744
    for (const odt of this.omitDependencyTypes) {
      args.push(`--omit=${odt}`)
    }

    for (const workspace of this.workspace) {
      args.push(`--workspace=${workspace}`)
    }
    if (this.includeWorkspaceRoot !== undefined) {
      args.push(`--include-workspace-root=${this.includeWorkspaceRoot}`)
    }
    if (this.workspaces !== undefined) {
      args.push(`--workspaces=${this.workspaces}`)
    }

    this.console.info('INFO  | gathering dependency tree ...')
    this.console.debug('DEBUG | npm-ls: run npm with %j in %j', args, projectDir)
    /* eslint-disable-next-line @typescript-eslint/init-declarations -- ack */
    let npmLsReturns: Buffer
    try {
      npmLsReturns = this.npmRunner.run(args, {
        cwd: projectDir,
        env: process_.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'buffer',
        maxBuffer: Number.MAX_SAFE_INTEGER // DIRTY but effective
      })
    } catch (runError: any) {
      // this.console.group('DEBUG | npm-ls: STDOUT')
      // this.console.debug('%s', runError.stdout)
      // this.console.groupEnd()
      this.console.group('WARN  | npm-ls: MESSAGE')
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- ack */
      this.console.warn('%s', runError.message)
      this.console.groupEnd()
      this.console.group('ERROR | npm-ls: STDERR')
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- ack */
      this.console.error('%s', runError.stderr)
      this.console.groupEnd()
      if (!this.ignoreNpmErrors) {
        throw new Error(
          /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- ack */
          `npm-ls exited with errors: ${runError.status ?? 'noStatus'} ${runError.signal ?? 'noSignal'}`,
          { cause: runError })
      }
      this.console.debug('DEBUG | npm-ls exited with errors that are to be ignored.')
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- ack */
      npmLsReturns = runError.stdout ?? Buffer.alloc(0)
    }
    // this.console.debug('stdout: %s', npmLsReturns)
    try {
      return JSON.parse(npmLsReturns.toString())
    } catch (jsonParseError) {
      throw new Error(
        'failed to parse npm-ls response',
        { cause: jsonParseError })
    }
  }

  buildFromNpmLs (data: any, npmVersion: string): Models.Bom {
    this.console.info('INFO  | building BOM ...')

    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- ack */
    const dataPath = data.path
    if(!isString(dataPath) || dataPath.length === 0)
    {
      throw new Error(`unexpected path ${JSON.stringify(dataPath)}`)
    }

    const allPackages = this.gatherPackages(data)
    const allComponents = new Map(iteratorMap(
      allPackages.entries(),
      ([p, packageData]) => [p, this.makeComponent(packageData)]
      ))

    const rootComponent = allComponents.get(dataPath)

    const bom = new Models.Bom()

    // region metadata

    bom.metadata.component = rootComponent

    bom.metadata.tools.components.add(new Models.Component(
      Enums.ComponentType.Application, 'npm', {
        version: npmVersion
      // omit `group` and `externalReferences`, because we cannot be sure about the used tool's actual origin
      // omit `hashes`, because unfortunately there is no agreed process of generating them
      }))
    for (const toolC of this.makeToolCs()) {
      bom.metadata.tools.components.add(toolC)
    }

    if (!this.reproducible) {
      bom.serialNumber = Utils.BomUtility.randomSerialNumber()
      bom.metadata.timestamp = new Date()
    }

    // endregion metadata

    // region components
    // bom.components = ...
    // endregion components

    return bom
  }

  private gatherPackages(data: any): Map<PackagePath, PackageData> {
    const packages = new Map<PackagePath, PackageData>()
    const todo = [data]
    let w: typeof data
    while (w = todo.pop())
    {
      const path = packages.path
      if (isString(path)) {
        const d = packages.get(path)
        if (d === undefined) {
          // gather relevant data
          packages.set(path, {
            name: w.name,
            version: w.version,
            resolved: w.resolved,
            integrity: w.integrity,
            license: w.license
          })
        } else {
          d.resolved ??= w.resolved
          d.integrity ??= w.integrity
          d.license ??= w.license
        }
      }
      todo.push(Object.values(w.dependencies??{}))

    }
    return packages
  }

  private makeComponent (data: PackageData): Models.Component {
    return new Models.Component(Enums.ComponentType.Library, '@TODO')
  }

  private * makeToolCs (): Generator<Models.Component> {
    const packageJsonPaths: Array<[string, Enums.ComponentType]> = [
      [path.resolve(module.path, '..', 'package.json'), Enums.ComponentType.Application]
    ]

    const libs = [
      '@cyclonedx/cyclonedx-library'
    ].map(s => s.split('/', 2))
    const nodeModulePaths = require.resolve.paths('__some_none-native_package__') ?? []
    /* eslint-disable no-labels -- needed */
    libsLoop:
    for (const lib of libs) {
      for (const nodeModulePath of nodeModulePaths) {
        const packageJsonPath = path.resolve(nodeModulePath, ...lib, 'package.json')
        if (existsSync(packageJsonPath)) {
          packageJsonPaths.push([packageJsonPath, Enums.ComponentType.Library])
          continue libsLoop
        }
      }
    }
    /* eslint-enable no-labels */

    for (const [packageJsonPath, cType] of packageJsonPaths) {
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expected */
      const packageData = loadJsonFile(packageJsonPath) ?? {}
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- hint hint */
      normalizePackageJson(packageData as normalizePackageJson.Input /* add debug for warnings? */)
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- hint hint */
      const toolC = this.componentBuilder.makeComponent(packageData  as normalizePackageJson.Package, cType)
      if (toolC !== undefined) {
        yield toolC
      }
    }
  }

}

type PTree = Map<string, PTree>

export class TreeBuilder {
  fromPaths (paths: Set<string>, dirSeparator: string): PTree {
    const tree: PTree = new Map(Array.from(
      paths,
        p => [p + dirSeparator, new Map<string, PTree>()]))
    this.nestPT(tree)
    this.renderPR(tree, '')
    return tree
  }

  private renderPR (tree: PTree, pref: string): void {
    for (const [p, pTree] of [...tree.entries()]) {
      tree.delete(p)
      const pFull = pref + p
      this.renderPR(pTree, pFull)
      tree.set(pFull.slice(undefined, -1), pTree)
    }
  }

  private nestPT (tree: PTree): void {
    if (tree.size < 2) {
      // nothing to compare ...
      return
    }
    for (const [a, aTree] of tree) {
      for (const [b, bTree] of tree) {
        if (a === b) {
          continue
        }
        if (b.startsWith(a)) {
          aTree.set(b.slice(a.length), bTree)
          tree.delete(b)
        } else if (a.startsWith(b)) {
          bTree.set(a.slice(b.length), aTree)
          tree.delete(a)
        }
      }
    }
    for (const c of tree.values()) {
      this.nestPT(c)
    }
  }
}
