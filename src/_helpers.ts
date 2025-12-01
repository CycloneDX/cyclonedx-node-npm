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

import { readFileSync, writeSync } from 'node:fs'

import normalizePackageData from 'normalize-package-data'


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
    } catch (error:any) {
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- ack */
      if (error.code !== 'EAGAIN') {
        throw error // forward
      }
      /* eslint-disable-next-line promise/avoid-new, no-await-in-loop -- needed */
      await new Promise((resolve) => { setTimeout(resolve, 100) })
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

// region version compare

export type Version = readonly number[]
export type CompareResult = -1 | 0 | 1

export function versionTuple (value: string): Version {
  return Object.freeze(value.split('.').map(Number))
}

export function versionCompare (a: Version, b: Version): CompareResult {
  /* eslint-disable-next-line no-plusplus -- save */
  for (let i = 0, l = Math.max(a.length, b.length); i < l; ++i) {
    // make values NaN-save, null-safe, undefined-safe
    const ai = a[i] || 0 /* eslint-disable-line @typescript-eslint/strict-boolean-expressions -- needed */
    const bi = b[i] || 0 /* eslint-disable-line @typescript-eslint/strict-boolean-expressions -- needed */
    if (ai < bi) {
      // A < B
      return -1
    }
    if (ai > bi) {
      // A > B
      return 1
    }
  }
  // A == B
  return 0
}
// endregion version compare

export function * iterableMap <I, R> (iter: Iterable<I>, func: (e: I) => R): Generator<R> {
  for (const item of iter) {
    yield func(item)
  }
}

export function * iterableFilter <I> (iter: Iterable<I>, func: (e: I) => boolean): Generator<I> {
  for (const item of iter) {
    if (func(item)) {
      yield item
    }
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
-- ack */
/* @ts-expect-error TS2550 -- Set.difference() exists in node since node2024 */
export const setDifference: <I>(s1: Set<I>, s2: Set<any>) => Set<I> = typeof Set.prototype.difference === 'function'
  /* @ts-expect-error TS2550 */
  ? (s1, s2) => s1.difference(s2)
  : (s1, s2) => new Set(iterableFilter(s1, (i) => !s2.has(i)) )
/* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */


export function normalizePackageManifest (data: any): asserts data is normalizePackageData.Package {
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access -- ack*/
  const oVersion = data.version

  /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ack */
  normalizePackageData(data as normalizePackageData.Input /* add debug for warnings? */)

  if (isString(oVersion)) {
    // normalizer might have stripped version or sanitized it to SemVer -- we want the original
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,  no-param-reassign -- ack */
    data.version = oVersion.trim()
  }
}
