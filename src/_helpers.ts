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

import { readFileSync, writeSync } from 'fs'
import { extname, parse } from 'path'

export const structuredClonePolyfill: <T>(value: T) => T = typeof structuredClone === 'function'
  ? structuredClone
  : function (value) { return JSON.parse(JSON.stringify(value)) }

export function loadJsonFile (path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'))
  // may be replaced by `require(f, { with: { type: "json" } })`
  // as soon as this spec is properly implemented.
  // see https://github.com/tc39/proposal-import-attributes
}

export async function writeAllSync (fd: number, data: string): Promise<number> {
  const b = Buffer.from(data)
  const l = b.byteLength
  let w = 0
  while (w < l) {
    try {
      w += writeSync(fd, b, w)
    } catch (error: any) {
      if (error.code !== 'EAGAIN') {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  return w
}

export function isString (v: any): v is string {
  return typeof v === 'string'
}

export function tryRemoveSecretsFromUrl (url: string): string {
  try {
    const u = new URL(url)
    u.password = ''
    return u.toString()
  } catch {
    return url
  }
}

// region MIME

export type MimeType = string

const MIME_TEXT_PLAIN: MimeType = 'text/plain'

const MAP_TEXT_EXTENSION_MIME: Readonly<Record<string, MimeType>> = {
  '': MIME_TEXT_PLAIN,
  // https://www.iana.org/assignments/media-types/media-types.xhtml
  '.csv': 'text/csv',
  '.htm': 'text/html',
  '.html': 'text/html',
  '.md': 'text/markdown',
  '.txt': MIME_TEXT_PLAIN,
  '.rst': 'text/prs.fallenstein.rst',
  '.xml': 'text/xml', // not `application/xml` -- our scope is text!
  // add more mime types above this line. pull-requests welcome!
  // license-specific files
  '.license': MIME_TEXT_PLAIN,
  '.licence': MIME_TEXT_PLAIN
} as const

export function getMimeForTextFile (filename: string): MimeType | undefined {
  return MAP_TEXT_EXTENSION_MIME[extname(filename).toLowerCase()]
}

const LICENSE_FILENAME_BASE = new Set(['licence', 'license'])
const LICENSE_FILENAME_EXT = new Set([
  '.apache',
  '.bsd',
  '.gpl',
  '.mit'
])

export function getMimeForLicenseFile (filename: string): MimeType | undefined {
  const { name, ext } = parse(filename.toLowerCase())
  return LICENSE_FILENAME_BASE.has(name) && LICENSE_FILENAME_EXT.has(ext)
    ? MIME_TEXT_PLAIN
    : MAP_TEXT_EXTENSION_MIME[ext]
}

// endregion MIME

// region version compare

type Version = number[]
type CompareResult = -1 | 0 | 1

export function versionCompare (a: Version, b: Version): CompareResult {
  let ai: number, bi: number
  for (let i = 0, l = Math.max(a.length, b.length); i < l; ++i) {
    // make values NaN-save, null-safe, undefined-safe
    ai = a[i] || 0 /* eslint-disable-line @typescript-eslint/strict-boolean-expressions */
    bi = b[i] || 0 /* eslint-disable-line @typescript-eslint/strict-boolean-expressions */
    if (ai < bi) {
      // A < B
      return -1
    }
    if (ai > bi) {
      // A > B
      return +1
    }
  }
  // A == B
  return 0
}
// endregion version compare
