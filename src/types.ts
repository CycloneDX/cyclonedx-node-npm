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


// is the dir/path in which a package resides
export type PackagePath = string

export interface PackageData {
  private?: boolean
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
