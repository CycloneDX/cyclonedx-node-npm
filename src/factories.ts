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

import { Utils as FromNodePackageJsonUtils } from "@cyclonedx/cyclonedx-library/Contrib/FromNodePackageJson"
import type normalizePackageData from "normalize-package-data"
import type { PurlQualifiers } from "packageurl-js"
import { PackageURL, PurlQualifierNames } from "packageurl-js"

import {
  isString,
  npmResolvedIgnoreMatcher, npmResolvedVcsMatcher
} from "./_helpers";
import type {PackageData} from "./_types"


export class PackageUrlFactory {

  makeFromPackageData(data: PackageData): PackageURL | undefined {
    if ( data.private === true ) {
      // Per PackageUrl spec, private packages do not have one.
      return undefined
    }

    let name: string = data.name
    let namespace: string | undefined = undefined
    if ( name.startsWith('@') ) {
      const nameParts = name.split('/')
      namespace = nameParts.shift()
      name = nameParts.join('/')
    }

    const version = isString(data.version)
      ? data.version
      : undefined

    const qualifiers: PurlQualifiers = {}
    if ( isString(data.resolved) && !npmResolvedIgnoreMatcher.test(data.resolved)) {
      if (npmResolvedVcsMatcher.test(data.resolved)) {
        qualifiers[PurlQualifierNames.VcsUrl] = data.resolved
      } else if (!FromNodePackageJsonUtils.defaultRegistryMatcher.test(data.resolved)) {
        qualifiers[PurlQualifierNames.DownloadUrl] = data.resolved
      }
    }

    try {
      // Do not beautify the parameters here, because that is in the domain of PackageURL and its representation.
      // No need to convert an empty "subpath" string to `undefined` and such.
      return new PackageURL(
        'npm',
        namespace,
        name,
        version,
        qualifiers,
        undefined
      )
    } catch {
      return undefined
    }
  }

  makeFromPackageJson(packageJson: normalizePackageData.Package): PackageURL | undefined {
    if ( packageJson.private === true ) {
      // Per PackageUrl spec, private packages do not have one.
      return undefined
    }

    let name: string = packageJson.name
    let namespace: string | undefined = undefined
    if ( name.startsWith('@') ) {
      const nameParts = name.split('/')
      namespace = nameParts.shift()
      name = nameParts.join('/')
    }

    const qualifiers: PurlQualifiers = {}
    // "dist" might be used in bundled dependencies' manifests.
    // docs: https://blog.npmjs.org/post/172999548390/new-pgp-machinery
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- acknowledged */
    const { tarball } = packageJson.dist ?? {}
    if ( isString(tarball) && tarball.length > 5
      && !FromNodePackageJsonUtils.defaultRegistryMatcher.test(tarball)
    ) {
      qualifiers[PurlQualifierNames.DownloadUrl] = tarball
    } else if ( typeof packageJson.repository === 'object' ) {
      const url = new URL(packageJson.repository.url)
      /* @ts-expect-error -- missing type docs */
      const subdir =  packageJson.repository.directory /* eslint-disable-line @typescript-eslint/no-unsafe-assignment -- ack */
      if ( isString(subdir) ) {
        url.hash = subdir
      }
      qualifiers[PurlQualifierNames.VcsUrl] = url.toString()
    }

    try {
      // Do not beautify the parameters here, because that is in the domain of PackageURL and its representation.
      // No need to convert an empty "subpath" string to `undefined` and such.
      return new PackageURL(
        'npm',
        namespace,
        name,
        packageJson.version,
        qualifiers,
        undefined
      )
    } catch {
      return undefined
    }
  }

}
