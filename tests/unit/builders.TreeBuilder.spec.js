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

const { TreeBuilder } = require('../../dist/builders')

describe('builders.TreeBuilder', () => {
  describe('fromDosPaths', () => {
    test.each([
      ['distinct paths', [
        'C:\\foo\\bar',
        'D:\\foo\\baz'
      ], {
        name: undefined,
        children: new Set([
          { name: 'C:\\foo\\bar' },
          { name: 'D:\\foo\\baz' }
        ])
      }
      ],
      ['transitive paths', [
        'C:\\a',
        'C:\\a\\b',
        'C:\\a\\c\\d',
        'C:\\a\\c\\e',
        'C:\\a\\c\\e\\f\\g'
      ], {
        name: 'C:\\a',
        children: new Set([
          { name: 'C:\\a\\b' },
          { name: 'C:\\a\\c\\d' },
          {
            name: 'C:\\a\\c\\e',
            children: new Set([{ name: 'C:\\a\\c\\e\\f\\g' }])
          }
        ])
      }
      ]
    ])('%s', (purpose, paths, expected) => {
      const treeBuilder = new TreeBuilder()
      const actual = treeBuilder.fromDosPaths(paths)
      expect(actual).toMatchObject(expected)
    })
  })

  describe('fromUnixPaths', () => {
    test.each([
      ['distinct paths', [
        '/foo/baz',
        '/bar/baz'
      ], {
        name: undefined,
        children: new Set([
          { name: '/foo/baz' },
          { name: '/bar/baz' }
        ])
      }
      ],
      ['transitive paths', [
        '/a',
        '/a/b',
        '/a/c/d',
        '/a/c/e',
        '/a/c/e/f/g'
      ], {
        name: '/a',
        children: new Set([
          { name: '/a/b' },
          { name: '/a/c/d' },
          {
            name: '/a/c/e',
            children: new Set([{ name: '/a/c/e/f/g' }])
          }
        ])
      }
      ]
    ])('%s', (purpose, paths, expected) => {
      const treeBuilder = new TreeBuilder()
      const actual = treeBuilder.fromUnixPaths(paths)
      expect(actual).toMatchObject(expected)
    })
  })
})
