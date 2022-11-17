# _NodeJS_ Internals

## Basics

A package might have a name, a version, and dependencies.  
This information is usually stored in a `package.json` file.

A package might have submodules or subpackages.  
These are usually stored in a `node_modules` folder next to the `package.json`.

## How _NodeJS_'s module/package resolution works

_NodeJS_'s module/package system is file-system based. It works regardless of package dependencies.  
When code in package `foo` tries to use/require/access code from a different package `bar`,
then _NodeJS_ will look in `foo`'s own/direct `node_modules` folder.
If it did not find any `bar` there, then NodeJS traverses all folders upwards and does the same lookup there,
until it finds any `bar`.  
This file-based loading behavior happens regardless of components' "dependency graph".  
This loading behavior is - as described - not flat but hierarchical.

See [NodeJS docs](https://nodejs.org/api/packages.html#introduction)

## Implications

Based on this module resolution system it might appear that one complex tree might have multiple individual
instances of module `bar`.
Each of these instances might have a different content.
If two of these instances had equal content - on a module basis - they are still not the same module,
as their own `node_modules` might be different, which causes submodules being not the same.
If two of these instances had equal content - on a module basis - they are still not the same module,
as their position in the global module-resolution-tree might be different and therefore causes this very instances
to have different dependencies in the first place. 
So two modules at different paths with equal file contents are most likely not the same.

Imagine each NodeJS-module as a node in a directed graph.  
Each node has a set of properties. Properties represent file-content(checksums), module-name, and so on.
A directed edge in this graph represents module access in terms of node's module-resolution-system.
Therefore, the graph is not implicit, so that no transitive module-resolution is to be expected.
If a module A can (by any means) load module B, then a directed edge from A to B must exist.
This graph is per definition in the format of a directed tree.  
In that graph two directed edges E1 and E2 are equal, if and only if:  
a) E1's start-node equals E2's end-node, and  
b) E1's end-node equals E2's end-node.  
In that graph two nodes N1 and N2 are equal, if and only if:  
a) N1's set of node properties is equal to N2's set of node properties, and  
b) N1's set of directed edges is equal to N2's set of directed edges.

In graph following the given definition, two NodeJS-modules described as nodes can be de-duplicated if they are equal.

## Examples

Find an example in [Results Examples](result.md#examples-and-visualisation )
