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
  isString,
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

type cPath = string
type AllComponents = Map<cPath, Models.Component>

export class BomBuilder {
  npmRunner: NpmRunner
  componentBuilder: Builders.FromNodePackageJson.ComponentBuilder
  leFetcher: Builders.License.LicenseEvidenceFetcher
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
    leFetcher: BomBuilder['leFetcher'],
    options: BomBuilderOptions,
    console_: BomBuilder['console']
  ) {
    this.npmRunner = npmRunner
    this.componentBuilder = componentBuilder
    this.treeBuilder = treeBuilder
    this.purlFactory = purlFactory
    this.leFetcher = leFetcher

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

    // region all components & dependencies

    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing --
     * as we need to enforce a proper root component to enable all features of SBOM */
    const rootComponent: Models.Component = this.makeComponent(data, this.metaComponentType) ||
      new DummyComponent(this.metaComponentType, 'RootComponent')
    const allComponents: AllComponents = new Map([[dataPath, rootComponent]])
    this.gatherDependencies(allComponents, data, rootComponent.dependencies)
    this.finalizePathProperties(dataPath, allComponents.values())

    // endregion all components & dependencies

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

    bom.components = this.nestComponents(
      // remove rootComponent - so the elements that are nested below it are just returned.
      new Map(Array.from(allComponents.entries()).filter(([, c]) => c !== rootComponent)),
      this.treeBuilder.fromPaths(
        new Set(allComponents.keys()),
        // do not depend on `path.sep` -- this would be runtime-dependent, not input-dependent
        dataPath.startsWith('/') ? '/' : '\\'
      )
    )
    bom.components.forEach(c => { this.adjustNestedBomRefs(c, '') })
    rootComponent.components.clear()

    if (this.flattenComponents) {
      for (const component of allComponents.values()) {
        component.components.clear()
        if (component !== rootComponent) {
          bom.components.add(component)
        }
      }
    }

    // endregion components

    return bom
  }

  private adjustNestedBomRefs (component: Models.Component, pref: string): void {
    if (component.bomRef.value === undefined) {
      return
    }
    component.bomRef.value = pref + component.bomRef.value
    const fill = component.bomRef.value + '|'
    component.components.forEach(c => { this.adjustNestedBomRefs(c, fill) })
  }

  private nestComponents (allComponents: AllComponents, tree: PTree): Models.ComponentRepository {
    const children = new Models.ComponentRepository()
    for (const [p, pTree] of tree) {
      const component = allComponents.get(p)
      const components = this.nestComponents(allComponents, pTree)
      if (component === undefined) {
        components.forEach(c => children.add(c))
      } else {
        component.components = components
        children.add(component)
      }
    }
    return children
  }

  private gatherDependencies (allComponents: AllComponents, data: NonNullable<any>, directDepRefs: Set<Models.BomRef>): void {
    /* One and the same component may appear multiple times in the tree,
     * but only one occurrence has all the direct dependencies.
     * So we work only on the one `data` that actually has dependencies.
     */
    /* One and the same component may appear multiple times in the tree,
     * but only the most top-level has a complete set with all `dependencies` *and* `resolved`.
     * This detail might cause implementation changes: run over the top level first, then go into nested dependencies.
     */
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument -- ack */
    for (const [depName, depData] of Object.entries(data.dependencies ?? {}) as Iterable<[string, NonNullable<any>]>) {
      if (depData === null || typeof depData !== 'object') {
        // cannot build
        this.console.debug('DEBUG | skip malformed component %j in %j', depName, depData)
        continue // for-loop
      }
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- ack */
      const depPath = depData.path
      if (!isString(depPath) || depPath.length === 0) {
        // might be an optional dependency that was not installed
        // skip, as it was not installed anyway
        this.console.debug('DEBUG | skip missing component %j in %j', depName, depPath)
        continue // for-loop
      }

      let dep = allComponents.get(depPath)
      if (dep === undefined) {
        const _dep = this.makeComponent(depData)
        if (_dep === false) {
          // shall be skipped
          this.console.debug('DEBUG | skip impossible component %j in %j', depName, depPath)
          continue // for-loop
        }
        dep = _dep ??
          new DummyComponent(Enums.ComponentType.Library, `InterferedDependency.${depName}`)
        if (dep instanceof DummyComponent) {
          this.console.warn('WARN  | InterferedDependency %j in %j', depName, depPath)
        } else {
          this.console.debug('DEBUG | built component %j in %j: %j', depName, depPath, dep)
        }
        this.console.info('INFO  | add component for %j in %j', depName, depPath)
        allComponents.set(depPath, dep)
      }
      directDepRefs.add(dep.bomRef)

      this.gatherDependencies(allComponents, depData, dep.dependencies)
    }
  }

  /**
   * Some combinations/versions of `npm-install`/`npm-ls` are insufficient,
   * they fail to load package details or miss details.
   * So here is a poly-fill that loads ALL the package's data.
   */
  private enhancedPackageData<T>(data: T & { path: string }): T {
    if (!path.isAbsolute(data.path)) {
      this.console.debug('DEBUG | skip loading package manifest in %j', data.path)
      return data
    }
    const packageJsonPath = path.join(data.path, 'package.json')
    try {
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- false-positive */
      return Object.assign(
        loadJsonFile(packageJsonPath) ?? {},
        data
      ) as T
    } catch (err) {
      this.console.debug('DEBUG | failed loading package manifest %j: %s', packageJsonPath, err)
      return data
    }
  }

  /**
   * Ignore pattern for `resolved`.
   * - ignore: well, just ignore it ... i guess.
   * - file: local dist cannot be shipped and therefore should be ignored.
   */
  private readonly resolvedRE_ignore = /^(?:ignore|file):/i

  /* eslint-disable-next-line complexity -- ack*/
  private makeComponent (data: any & { path: string }, type?: Enums.ComponentType): Models.Component | false | undefined {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- needed */

    const isOptional = data.optional === true
    if (isOptional && this.omitDependencyTypes.has('optional')) {
      this.console.debug('DEBUG | omit optional component: %j %j', data.name, data._id)
      return false
    }

    const isDev = data.dev === true
    if (isDev && this.omitDependencyTypes.has('dev')) {
      this.console.debug('DEBUG | omit dev component: %j %j', data.name, data._id)
      return false
    }

    // attention: `data.devOptional` are not to be skipped with devs, since they are still required by optionals.
    const isDevOptional = data.devOptional === true
    if (isDevOptional && this.omitDependencyTypes.has('dev') && this.omitDependencyTypes.has('optional')) {
      this.console.debug('DEBUG | omit devOptional component: %j %j', data.name, data._id)
      return false
    }

    // work with a deep copy, because `normalizePackageJson()` might modify the data
    let _dataC = structuredClonePolyfill(data)
    if (!this.packageLockOnly) {
      _dataC = this.enhancedPackageData(_dataC)
    }
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ack */
    normalizePackageJson(_dataC as normalizePackageJson.Input /* add debug for warnings? */)
    // region fix normalizations
    if (isString(data.version)) {
      // allow non-SemVer strings
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-call -- ack */
      _dataC.version = data.version.trim()
    }
    // endregion fix normalizations

    const component = this.componentBuilder.makeComponent(
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ack */
      _dataC as normalizePackageJson.Package,
      type
    )
    if (component === undefined) {
      this.console.debug('DEBUG | skip broken component: %j %j', data.name, data._id)
      return undefined
    }

    component.licenses.forEach(l => {
      l.acknowledgement = Enums.LicenseAcknowledgement.Declared
    })

    if (this.gatherLicenseTexts) {
      if (this.packageLockOnly) {
        this.console.warn('WARN  | Adding license text is ignored (package-lock-only is configured!) for %j', data.name)
      } else {
        component.evidence = new Models.ComponentEvidence()
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- false-positive */
        for (const license of this.fetchLicenseEvidence(data.path)) {
            // only create a evidence if a license attachment is found
            component.evidence ??= new Models.ComponentEvidence();
            component.evidence.licenses.add(license)
        }
      }
    }

    if (isOptional || isDevOptional) {
      component.scope = Enums.ComponentScope.Optional
    }

    // region properties

    if (isString(data.path)) {
      component.properties.add(
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- false-positive */
        new Models.Property(PropertyNames.PackageInstallPath, data.path)
      )
    }
    if (isDev || isDevOptional) {
      component.properties.add(
        new Models.Property(PropertyNames.PackageDevelopment, PropertyValueBool.True)
      )
    }
    if (data.extraneous === true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackageExtraneous, PropertyValueBool.True)
      )
    }
    if (data.private === true || _dataC.private === true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackagePrivate, PropertyValueBool.True)
      )
    }
    if (data.inBundle === true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackageBundled, PropertyValueBool.True)
      )
    }

    // endregion properties

    const resolved = data.resolved
    if (isString(resolved) && !this.resolvedRE_ignore.test(resolved)) {
      const hashes = new Models.HashDictionary()
      const integrity = data.integrity
      if (isString(integrity)) {
        try {
          hashes.set(...Utils.NpmjsUtility.parsePackageIntegrity(integrity))
        } catch { /* pass */}
      }
      component.externalReferences.add(
        new Models.ExternalReference(
          tryRemoveSecretsFromUrl(resolved),
          Enums.ExternalReferenceType.Distribution,
          {
            hashes,
            comment: 'as detected from npm-ls property "resolved"' +
              (hashes.size > 0 ? ' and property "integrity"' : '')
          }
        )
      )
    }

    /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

    // even private packages may have a PURL for identification
    component.purl = this.makePurl(component)

    /* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
       -- since empty-string handling is needed */
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- ack */
    component.bomRef.value = (isString(data._id) ? data._id : undefined) ||
      `${component.group || '-'}/${component.name}@${component.version || '-'}`
    /* eslint-enable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */

    return component
  }

  private makePurl (component: Models.Component): ReturnType<BomBuilder['purlFactory']['makeFromComponent']> {
    const purl = this.purlFactory.makeFromComponent(component, this.reproducible)
    if (purl === undefined) {
      return undefined
    }

    if (this.shortPURLs) {
      purl.qualifiers = undefined
      purl.subpath = undefined
    }

    return purl
  }

  private finalizePathProperties (rootPath: any, components: IterableIterator<Models.Component>): void {
    if (!isString(rootPath) || rootPath === '') {
      return
    }
    /* eslint-disable @typescript-eslint/unbound-method -- needed */
    // do not depend on `node:path.relative()` -- this would be runtime-dependent, not input-dependent
    const [relativePath, dirSepRE] = rootPath.startsWith('/')
      ? [path.posix.relative, /\//g]
      : [path.win32.relative, /\\/g]
    /* eslint-enable @typescript-eslint/unbound-method */
    for (const component of components) {
      for (const property of component.properties) {
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- false positive */
        if (property.name !== PropertyNames.PackageInstallPath) {
          continue
        }
        if (property.value === '') {
          component.properties.delete(property)
          continue
        }
        property.value = relativePath(rootPath, property.value).replace(dirSepRE, '/')
      }
    }
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

  private * fetchLicenseEvidence (dirPath: string): Generator<Models.License> {
    try {
      return this.leFetcher.fetch(
        dirPath,
        (error: Error): void => {
          /* c8 ignore next 2 */
          this.console.info(`INFO  | ${error.message}`)
          this.console.debug(`DEBUG | ${error.message} -`, error)
        }
      )
    } catch (e) {
      this.console.warn('WARN  | collecting license evidence in', dirPath, 'failed:', e)
    }
  }
}

class DummyComponent extends Models.Component {
  constructor (type: Models.Component['type'], name: Models.Component['name']) {
    super(type, `DummyComponent.${name}`, {
      bomRef: `DummyComponent.${name}`,
      description: `This is a dummy component "${name}" that fills the gap where the actual built failed.`
    })
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
