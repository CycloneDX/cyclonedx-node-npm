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

import {type Builders, Enums, type Factories, Models, Utils} from '@cyclonedx/cyclonedx-library'
import normalizePackageJson from 'normalize-package-data'

import {
  isString, iteratorFilter, iteratorMap,
  loadJsonFile, setDifference,
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

// is the dir/path in which a package resides
type PackagePath = string
interface PackageData {
  name: string
  /** !!! local packages might not have a version */
  version?: any
  funding?: any
  license?: any
  /** where was the package downloaded from? */
  resolved?: string
  /** kind-of checksum of that resolved version */
  integrity?: string
  /** is (transitive) optional */
  optional?: boolean
  /** is dev-dependency */
  dev?: boolean
  /*** is dev-dependency AND is (transitive) optional */
  devOptional?: boolean
  /** is not required by any dependency */
  extraneous?: boolean
  /** is bundled with another package */
  inBundle?: boolean
  dependencies: Set<PackagePath>
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
    leGatherer: BomBuilder['leGatherer'],
    options: BomBuilderOptions,
    console_: BomBuilder['console']
  ) {
    this.npmRunner = npmRunner
    this.componentBuilder = componentBuilder
    this.treeBuilder = treeBuilder
    this.purlFactory = purlFactory
    this.leGatherer = leGatherer

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

  buildFromNpmLs(data: any, npmVersion: string): Models.Bom {
    this.console.info('INFO  | building BOM ...')

    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- ack */
    const rootPath = data.path
    if (!isString(rootPath) || rootPath.length === 0) {
      throw new Error(`unexpected path ${JSON.stringify(rootPath)}`)
    }

    const allPackages = this.gatherPackages(data)
    const allComponents = new Map(iteratorMap(
      allPackages,
      ([p, packageData]) => [p, this.makeComponentWithPackageData(packageData, p)]
    ))
    /* eslint-disable-next-line @typescript-eslint/init-declarations -- ack */
    let rootComponent
    try {
      rootComponent = this.makeComponentFromPackagePath(rootPath, this.metaComponentType)
      allComponents.set(rootPath, rootComponent)
    } catch (err) {
      this.console.debug('DEBUG | failed make rootComponent, fallback to existing one.', err)
      rootComponent = allComponents.get(rootPath)
      if ( rootComponent === undefined) { throw new TypeError('missing rootComponent') }
      rootComponent.type = this.metaComponentType
    }

    // do not depend on `node:path.relative()` -- this would be runtime-dependent, not input-dependent
    /* eslint-disable @typescript-eslint/unbound-method -- ack */
    const [relativePath, dirSep, dirSepRE] = rootPath.startsWith('/')
      ? [path.posix.relative, '/', /\//g]
      : [path.win32.relative, '\\', /\\/g]
    /* eslint-enable @typescript-eslint/unbound-method */
    allComponents.forEach((c, p) => {
      c.purl = this.makePurl(c)
      c.properties.add(new Models.Property(
        PropertyNames.PackageInstallPath,
    relativePath(rootPath, p).replace(dirSepRE, '/')
        ))
    })

    const pTree = this.treeBuilder.fromPaths(rootPath,allComponents.keys(), dirSep)

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
    if (this.flattenComponents) {
      for (const c of allComponents.values()) {
        if (c === rootComponent) { continue }
        bom.components.add(c)
      }
    } else {
      bom.components = this.nestComponents(allComponents, pTree)
      bom.components.delete(rootComponent)
      rootComponent.components.forEach(c => bom.components.add(c) )
      rootComponent.components.clear()
    }
    // endregion components

    // region dependency graph
    this.bomrefComponents(allComponents, pTree)
    this.makeDependencyGraph(allComponents, allPackages)
    // endregion dependency graph

    return bom
  }

  private fetchNpmLs(projectDir: string, process_: NodeJS.Process): any {
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
          {cause: runError})
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
        {cause: jsonParseError})
    }
  }

  /* eslint-disable-next-line complexity -- ack */
  private gatherPackages(data: any): Map<PackagePath, PackageData> {
    const packages = new Map<PackagePath, PackageData>()
    const todo: Array<typeof data> = [data]
    let w: any = undefined
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ack */
    while ((w = todo.shift()) !== undefined) {
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- ack */
      const wpath = w.path
      if (!isString(wpath)) { continue }
      let d = packages.get(wpath)
      if (d === undefined) {
        d = {
          name: w.name,
          version: w.version,
          resolved: w.resolved,
          integrity: w.integrity,
          inBundle: w.inBundle,
          extraneous: w.extraneous,
          optional: w.optional,
          devOptional: w.devOptional,
          dev: w.dev,
          dependencies: new Set()
        }
        packages.set(wpath, d)
      } else {
        d.version ??= w.version
        d.resolved ??= w.resolved
        d.integrity ??= w.integrity
        d.inBundle ??= w.inBundle
        d.extraneous ??= w.extraneous
        d.optional ??= w.optional
        d.devOptional ??= w.devOptional
        d.dev ??= w.dev
      }
      // `dependencies` might be missing to prevent circles...
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-unsafe-argument -- ack */
      for (const {path: depPath} of Object.values(w.dependencies ?? {}) as typeof data) {
        if (!isString(depPath)) { continue }
        d.dependencies.add(depPath)
      }
      todo.push(...Object.values(w.dependencies ?? {}) as typeof data)
      /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    }
    return packages
  }

  private * fetchLicenseEvidence (dirPath: string): Generator<Models.License> {
    const files = this.leGatherer.getFileAttachments(
      dirPath,
      (error: Error): void => {
        /* c8 ignore next 2 */
        this.console.info(`INFO  | ${error.message}`)
        this.console.debug(`DEBUG | ${error.message} -`, error)
      }
    )
    try {
      for (const {file, text} of files) {
        yield new Models.NamedLicense(`file: ${file}`, {text})
      }
    }
    /* c8 ignore next 3 */
    catch (e) {
      // generator will not throw before first `.nest()` is called ...
      this.console.warn('WARN  | collecting license evidence in', dirPath, 'failed:', e)
    }
  }

  private normalizePackageJson(data: any): normalizePackageJson.Package {
    const dataN = structuredClonePolyfill(data)
    normalizePackageJson(dataN as normalizePackageJson.Input /* add debug for warnings? */)
    if (isString(data.version)) {
      // allow non-SemVer strings
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-call -- ack */
      dataN.version = data.version.trim()
    }
    return data
  }

  private makeComponentFromPackagePath(ppath: PackagePath, type: Enums.ComponentType): Models.Component {
      const manifest = loadJsonFile(path.join(ppath, 'package.json'))
      const component = this.componentBuilder.makeComponent(this.normalizePackageJson(manifest), type)
      if (component === undefined) {
        throw new TypeError('created no component')
      }

      component.licenses.forEach(l => {
        l.acknowledgement = Enums.LicenseAcknowledgement.Declared
      })

      if ( this.gatherLicenseTexts ) {
        component.evidence = new Models.ComponentEvidence()
        for (const le of this.fetchLicenseEvidence(ppath) ) {
          component.evidence.licenses.add(le)
        }
      }

      // region properties
      /* eslint-disable @typescript-eslint/no-unsafe-member-access -- needed */
      if (manifest.private === true) {
        component.properties.add(
          new Models.Property(PropertyNames.PackagePrivate, PropertyValueBool.True)
        )
      }
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      // endregion properties

      return component
  }

  /* eslint-disable-next-line complexity -- ack */
  private makeComponentWithPackageData(data: PackageData, ppath: PackagePath, type: Enums.ComponentType = Enums.ComponentType.Library): Models.Component {
    const isOptional = data.optional === true || data.devOptional === false
    let isExcluded= false

    let component: Models.Component | undefined = undefined
    if (!this.packageLockOnly) {
      try {
        component = this.makeComponentFromPackagePath(ppath, type)
      } catch (err: any) {
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- ack */
        if (err.code === 'ENOENT' && isOptional) {
          // an optional dependency that was probably excluded
          isExcluded = true
        } else {
          this.console.debug('DEBUG | creating DummyComponent for ', ppath, err)
        }
      }
    }
    if ( component === undefined ) {
      component = this.componentBuilder.makeComponent(
        this.normalizePackageJson({name: data.name, version: data.version}), type)
    }
    if (component === undefined) {
      this.console.info('INFO  | creating DummyComponent for ', ppath)
      component = new DummyComponent(type, ppath)
    }

    if (isExcluded) {
      component.scope = Enums.ComponentScope.Excluded
    } else if (isOptional) {
      component.scope = Enums.ComponentScope.Optional
    }

    // region properties
    if (data.dev === true || data.devOptional ===  true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackageDevelopment, PropertyValueBool.True)
      )
    }
    if (data.extraneous === true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackageExtraneous, PropertyValueBool.True)
      )
    }
    if (data.inBundle === true) {
      component.properties.add(
        new Models.Property(PropertyNames.PackageBundled, PropertyValueBool.True)
      )
    }
    // endregion properties

    // region resolved
    const rref = this.makeExtRefDistFromPachageData(data)
    if ( rref !== undefined ) {
      component.externalReferences.add(rref)
    }
    // endregion resolved

    return component
  }

  /**
   * Ignore pattern for `resolved`.
   * - ignore: well, just ignore it ... i guess.
   * - file: local dist cannot be shipped and therefore should be ignored.
   */
  private readonly resolvedRE_ignore = /^(?:ignore|file):/i

  private makeExtRefDistFromPachageData (data: PackageData): Models.ExternalReference | undefined {
    const {resolved, integrity} = data
    if (!isString(resolved) || this.resolvedRE_ignore.test(resolved)) {
      return undefined
    }
    const rref = new Models.ExternalReference(
      tryRemoveSecretsFromUrl(resolved),
      Enums.ExternalReferenceType.Distribution,
      { comment: 'as detected from npm-ls property "resolved"' }
    )
    if (isString(integrity)) {
      try {
        // actually not the hash of the file, but more of an integrity-check -- lets use it anyway.
        // see https://blog.npmjs.org/post/172999548390/new-pgp-machinery
        rref.hashes.set(...Utils.NpmjsUtility.parsePackageIntegrity(integrity))
        rref.comment += ' and property "integrity"'
      } catch { /* pass */ }
    }
    return rref
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
      const toolC = this.componentBuilder.makeComponent(packageData as normalizePackageJson.Package, cType)
      if (toolC !== undefined) {
        yield toolC
      }
    }
  }

  private nestComponents (allComponents: Map<PackagePath, Models.Component>, tree: PTree): Models.ComponentRepository {
    const children = new Models.ComponentRepository()
    for (const [p, pTree] of tree) {
      const component = allComponents.get(p)
      if (component === undefined) { throw new TypeError(`missing component for ${p}`)}
      component.components = this.nestComponents(allComponents, pTree)
      children.add(component)
    }
    return children
  }

  private bomrefComponents (allComponents: Map<PackagePath, Models.Component>, tree: PTree, pref = ''):void {
    for (const [p, cTree] of tree) {
      const component = allComponents.get(p)
      if (component === undefined) { throw new TypeError(`missing component for ${p}`) }
      /* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions -- need to account empty strings, too */
      const parts = [pref]
      if (component.group !== undefined && component.group.length > 0) {
        parts.push(component.group, '/')
      }
      parts.push(component.name)
      if (component.version !== undefined && component.version.length > 0) {
        parts.push('@', component.version)
      }
      component.bomRef.value = parts.join('')
      this.bomrefComponents(allComponents, cTree, `${component.bomRef.value}|`)
    }
  }

  private makeDependencyGraph (allComponents: Map<PackagePath, Models.Component>, allPackages: Map<PackagePath, PackageData>): void {
    for (const [p, comp] of allComponents) {
      const pkg = allPackages.get(p)
      if (pkg === undefined) { throw new TypeError(`missing pkg for ${p}`) }
      for (const depPkg of pkg.dependencies) {
        const depComp = allComponents.get(depPkg)
        if (depComp === undefined) { throw new TypeError(`missing depComp for ${depPkg}`) }
        comp.dependencies.add(depComp.bomRef)
      }
    }
  }

}

class DummyComponent extends Models.Component {
  constructor(type: Models.Component['type'], name: Models.Component['name']) {
    super(type, `DummyComponent.${name}`, {
      bomRef: `DummyComponent.${name}`,
      description: `This is a dummy component "${name}" that fills the gap where the actual built failed.`
    })
  }
}

type PTree = Map<PackagePath, PTree>

export class TreeBuilder {
  fromPaths (root: PackagePath, paths: Iterable<PackagePath>, dirSeparator: string): PTree {
    root += dirSeparator
    const upaths = new Set<PackagePath>(iteratorMap(paths, p => `${p}${dirSeparator}`))
    const outs =  new Set<PackagePath>(iteratorFilter(upaths, p => !p.startsWith(root)))
    const inTree: PTree = new Map(iteratorMap(setDifference(upaths, outs), p => [p, new Map()]))
    this.nestPT( inTree)
    const outTree: PTree = new Map(iteratorMap(outs, p => [p, new Map()]))
    this.nestPT( outTree)
    const tree: PTree = new Map()
    outTree.forEach((v,k) => { tree.set(k, v) } )
    inTree.forEach((v,k) => { tree.set(k, v) })
    this.renderPR(tree, '')
    return tree
  }

  private renderPR (tree: PTree, pref: PackagePath): void {
    // work with a copy of the tree, as we will modify it on the go
    for (const [p, pTree] of [...tree]) {
      tree.delete(p)
      const pFull = pref + p
      this.renderPR(pTree, pFull)
      tree.set(pFull.slice(undefined, -1), pTree)
    }
  }

  private nestPT(tree: PTree): void {
    if (tree.size < 2) {
      // nothing to compare ...
      return
    }
    const treeI = [...tree]
    for (const [a, aTree] of treeI) {
      for (const [b, bTree] of treeI) {
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
