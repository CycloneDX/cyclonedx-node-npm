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

const {
  Builders: FromNodePackageJsonBuilders,
  Factories: FromNodePackageJsonFactories
} = require('@cyclonedx/cyclonedx-library/Contrib/FromNodePackageJson')
const {
  Factories: LicenseFactories,
  Utils: LicenseUtils
} = require('@cyclonedx/cyclonedx-library/Contrib/License')
const { describe, expect, test } = require('@jest/globals')
const spdxExpressionParse = require('spdx-expression-parse')

const { BomBuilder, TreeBuilder } = require('../../dist/builders')
const { PackageUrlFactory } = require('../../dist/factories')

function makeBomBuilder (npmLsOutput, omitDependencyTypes) {
  const npmRunner = {
    run: () => Buffer.from(JSON.stringify(npmLsOutput)),
    getVersion: () => '10.9.9'
  }
  const noopConsole = {
    info: () => {},
    debug: () => {},
    warn: () => {},
    error: () => {},
    log: () => {},
    group: () => {},
    groupEnd: () => {}
  }
  return new BomBuilder(
    npmRunner,
    new FromNodePackageJsonBuilders.ComponentBuilder(
      new FromNodePackageJsonFactories.ExternalReferenceFactory(),
      new LicenseFactories.LicenseFactory(spdxExpressionParse)
    ),
    new TreeBuilder(),
    new PackageUrlFactory(),
    new LicenseUtils.LicenseEvidenceGatherer(),
    {
      packageLockOnly: true,
      flattenComponents: true,
      reproducible: true,
      omitDependencyTypes
    },
    noopConsole
  )
}

function listComponentNames (bom) {
  return Array.from(bom.components, c => c.name).sort()
}

describe('builders.BomBuilder', () => {
  describe('omitDependencyTypes filtering', () => {
    const complexTree = {
      name: 'root-app',
      version: '1.0.0',
      path: '/app',
      _dependencies: {
        'prod-lib': '^1.0.0',
        'root-opt': '^1.0.0'
      },
      optionalDependencies: {
        'root-opt': '^1.0.0'
      },
      devDependencies: {
        'dev-tool': '^1.0.0'
      },
      peerDependencies: {
        'root-peer': '^1.0.0',
        'root-peer-opt': '^1.0.0'
      },
      peerDependenciesMeta: {
        'root-peer-opt': { optional: true }
      },
      dependencies: {
        'prod-lib': {
          name: 'prod-lib',
          version: '1.0.0',
          path: '/app/node_modules/prod-lib',
          _dependencies: {
            'prod-child': '^1.0.0',
            'trans-opt': '^1.0.0'
          },
          optionalDependencies: {
            'trans-opt': '^1.0.0'
          },
          peerDependencies: {
            'prod-child': '^1.0.0',
            'trans-peer': '^1.0.0'
          },
          dependencies: {
            'prod-child': {
              name: 'prod-child',
              version: '1.0.0',
              path: '/app/node_modules/prod-child',
              _dependencies: {},
              peerDependencies: {}
            },
            'trans-opt': {
              name: 'trans-opt',
              version: '1.0.0',
              path: '/app/node_modules/trans-opt',
              optional: true,
              _dependencies: {
                'shared-dev-opt': '^1.0.0',
                'dedup-shared': '^1.0.0'
              },
              peerDependencies: {},
              dependencies: {
                'shared-dev-opt': {
                  name: 'shared-dev-opt',
                  version: '1.0.0',
                  path: '/app/node_modules/shared-dev-opt',
                  devOptional: true,
                  _dependencies: {
                    'dev-opt-leaf': '^1.0.0'
                  },
                  peerDependencies: {},
                  dependencies: {
                    'dev-opt-leaf': {
                      name: 'dev-opt-leaf',
                      version: '1.0.0',
                      path: '/app/node_modules/dev-opt-leaf',
                      devOptional: true,
                      _dependencies: {},
                      peerDependencies: {}
                    }
                  }
                },
                // First occurrence of dedup-shared is under an optional branch and carries its dependencies
                'dedup-shared': {
                  name: 'dedup-shared',
                  version: '1.0.0',
                  path: '/app/node_modules/dedup-shared',
                  _dependencies: {
                    'dedup-child': '^1.0.0'
                  },
                  peerDependencies: {},
                  dependencies: {
                    'dedup-child': {
                      name: 'dedup-child',
                      version: '1.0.0',
                      path: '/app/node_modules/dedup-child',
                      _dependencies: {},
                      peerDependencies: {}
                    }
                  }
                }
              }
            },
            'trans-peer': {
              name: 'trans-peer',
              version: '1.0.0',
              path: '/app/node_modules/trans-peer',
              peer: true,
              _dependencies: {},
              peerDependencies: {}
            }
          }
        },
        'root-opt': {
          name: 'root-opt',
          version: '1.0.0',
          path: '/app/node_modules/root-opt',
          optional: true,
          _dependencies: {},
          peerDependencies: {}
        },
        'dev-tool': {
          name: 'dev-tool',
          version: '1.0.0',
          path: '/app/node_modules/dev-tool',
          dev: true,
          _dependencies: {
            'shared-dev-opt': '^1.0.0'
          },
          peerDependencies: {},
          dependencies: {
            'shared-dev-opt': {
              name: 'shared-dev-opt',
              version: '1.0.0',
              path: '/app/node_modules/shared-dev-opt',
              devOptional: true,
              _dependencies: {
                'dev-opt-leaf': '^1.0.0'
              },
              peerDependencies: {}
            }
          }
        },
        'root-peer': {
          name: 'root-peer',
          version: '1.0.0',
          path: '/app/node_modules/root-peer',
          peer: true,
          _dependencies: {
            'dedup-shared': '^1.0.0'
          },
          peerDependencies: {},
          dependencies: {
            // Second occurrence of dedup-shared is a deduped stub without `dependencies`
            'dedup-shared': {
              name: 'dedup-shared',
              version: '1.0.0',
              path: '/app/node_modules/dedup-shared',
              _dependencies: {
                'dedup-child': '^1.0.0'
              },
              peerDependencies: {}
            }
          }
        },
        'root-peer-opt': {
          name: 'root-peer-opt',
          version: '1.0.0',
          path: '/app/node_modules/root-peer-opt',
          _dependencies: {},
          peerDependencies: {}
        },
        'extra-pkg': {
          name: 'extra-pkg',
          version: '1.0.0',
          path: '/app/node_modules/extra-pkg',
          extraneous: true,
          _dependencies: {},
          peerDependencies: {}
        }
      }
    }

    test('includes all packages when omit is empty', () => {
      const bom = makeBomBuilder(complexTree, []).buildFromProjectDir('/app', process)
      expect(listComponentNames(bom)).toEqual([
        'dedup-child',
        'dedup-shared',
        'dev-opt-leaf',
        'dev-tool',
        'extra-pkg',
        'prod-child',
        'prod-lib',
        'root-opt',
        'root-peer',
        'root-peer-opt',
        'shared-dev-opt',
        'trans-opt',
        'trans-peer'
      ])
    })

    test('retains devOptional packages when only dev is omitted', () => {
      const bom = makeBomBuilder(complexTree, ['dev']).buildFromProjectDir('/app', process)
      expect(listComponentNames(bom)).toEqual([
        'dedup-child',
        'dedup-shared',
        'dev-opt-leaf',
        'extra-pkg',
        'prod-child',
        'prod-lib',
        'root-opt',
        'root-peer',
        'root-peer-opt',
        'shared-dev-opt',
        'trans-opt',
        'trans-peer'
      ])
    })

    test('omits transitive optional and peerOptional packages while retaining devOptional and deduped children when only optional is omitted', () => {
      const bom = makeBomBuilder(complexTree, ['optional']).buildFromProjectDir('/app', process)
      expect(listComponentNames(bom)).toEqual([
        'dedup-child',
        'dedup-shared',
        'dev-opt-leaf',
        'dev-tool',
        'extra-pkg',
        'prod-child',
        'prod-lib',
        'root-peer',
        'shared-dev-opt',
        'trans-peer'
      ])
    })

    test('omits dev, transitive optional, and devOptional packages when both dev and optional are omitted', () => {
      const bom = makeBomBuilder(complexTree, ['dev', 'optional']).buildFromProjectDir('/app', process)
      expect(listComponentNames(bom)).toEqual([
        'dedup-child',
        'dedup-shared',
        'extra-pkg',
        'prod-child',
        'prod-lib',
        'root-peer',
        'trans-peer'
      ])
    })

    test('omits peer and peerOptional packages while preserving prod+peer dual-declared packages when peer is omitted', () => {
      const bom = makeBomBuilder(complexTree, ['peer']).buildFromProjectDir('/app', process)
      expect(listComponentNames(bom)).toEqual([
        'dedup-child',
        'dedup-shared',
        'dev-opt-leaf',
        'dev-tool',
        'extra-pkg',
        'prod-child',
        'prod-lib',
        'root-opt',
        'shared-dev-opt',
        'trans-opt'
      ])
    })

    test('omits dev, optional, devOptional, and peer packages when all omit types are set', () => {
      const bom = makeBomBuilder(complexTree, ['dev', 'optional', 'peer']).buildFromProjectDir('/app', process)
      expect(listComponentNames(bom)).toEqual([
        'extra-pkg',
        'prod-child',
        'prod-lib'
      ])
    })

    test('respects package-level flags when manifest dependency maps are absent and preserves workspace dev precedence', () => {
      const workspaceAndFlagsTree = {
        name: 'ws-root',
        version: '1.0.0',
        path: '/ws',
        workspaces: ['packages/*'],
        dependencies: {
          'pkg-a': {
            name: 'pkg-a',
            version: '1.0.0',
            path: '/ws/node_modules/pkg-a',
            resolved: 'file:../packages/pkg-a',
            devDependencies: {
              'ws-dev-peer': '^1.0.0'
            },
            peerDependencies: {
              'ws-dev-peer': '^1.0.0'
            },
            dependencies: {
              'ws-dev-peer': {
                name: 'ws-dev-peer',
                version: '1.0.0',
                path: '/ws/node_modules/ws-dev-peer'
              }
            }
          },
          'flag-dev-opt': {
            name: 'flag-dev-opt',
            version: '1.0.0',
            path: '/ws/node_modules/flag-dev-opt',
            devOptional: true
          },
          'flag-opt': {
            name: 'flag-opt',
            version: '1.0.0',
            path: '/ws/node_modules/flag-opt',
            optional: true
          },
          'flag-dev': {
            name: 'flag-dev',
            version: '1.0.0',
            path: '/ws/node_modules/flag-dev',
            dev: true
          },
          'flag-peer': {
            name: 'flag-peer',
            version: '1.0.0',
            path: '/ws/node_modules/flag-peer',
            peer: true
          }
        }
      }

      const bomOmitPeer = makeBomBuilder(workspaceAndFlagsTree, ['peer']).buildFromProjectDir('/ws', process)
      expect(listComponentNames(bomOmitPeer)).toEqual([
        'flag-dev',
        'flag-dev-opt',
        'flag-opt',
        'pkg-a',
        'ws-dev-peer'
      ])

      const bomOmitDevOpt = makeBomBuilder(workspaceAndFlagsTree, ['dev', 'optional']).buildFromProjectDir('/ws', process)
      expect(listComponentNames(bomOmitDevOpt)).toEqual([
        'flag-peer',
        'pkg-a'
      ])
    })
  })
})
