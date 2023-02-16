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

const { describe, expect, test } = require('@jest/globals')

describe('builders.TreeBuilder', () => {
  describe('fromPaths', () => {
    test.each([
      ['distinct dos-like paths', '\\',
        [
          'C:\\foo\\bar',
          'D:\\foo\\baz'
        ],
        new Map([
          ['C:\\foo\\bar', new Map()],
          ['D:\\foo\\baz', new Map()]
        ])
      ],
      ['transitive dos-like paths', '\\',
        [
          'C:\\a',
          'C:\\a\\b',
          'C:\\a\\c\\d',
          'C:\\a\\c\\e',
          'C:\\a\\c\\e\\f\\g'
        ],
        new Map([
          ['C:\\a', new Map([
            ['C:\\a\\b', new Map()],
            ['C:\\a\\c\\d', new Map()],
            ['C:\\a\\c\\e', new Map([
              ['C:\\a\\c\\e\\f\\g', new Map()]
            ])]
          ])]
        ])
      ],
      ['distinct paths', '/',
        [
          '/foo/baz',
          '/bar/baz'
        ],
        new Map([
          ['/foo/baz', new Map()],
          ['/bar/baz', new Map()]
        ])
      ],
      ['transitive paths', '/',
        [
          '/a',
          '/a/b',
          '/a/c/d',
          '/a/c/e',
          '/a/c/e/f/g'
        ],
        new Map([
          ['/a', new Map([
            ['/a/b', new Map()],
            ['/a/c/d', new Map()],
            ['/a/c/e', new Map([
              ['/a/c/e/f/g', new Map()]
            ])]
          ])]
        ])
      ]
    ])('%s', (purpose, pathSeparator, paths, expected) => {
      const treeBuilder = new TreeBuilder()
      const actual = treeBuilder.fromPaths(paths, pathSeparator)
      expect(actual).toMatchObject(expected)
    })
  })
})
