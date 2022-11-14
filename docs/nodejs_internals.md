# Node Internals

## _NodeJS_ Basics

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
This file-based loading behavior happens regardless of components' "dependency graph"

See [NodeJS docs](https://nodejs.org/api/packages.html#introduction)

## Implications

Based on this module resolution system it might appear that one complex tree might have multiple individual
instances of module "bar".
Each of these instances might have a different content.
If two of these instances had equal content - on a module basis - they are still not the same module,
as their own `node_modules` might be different, which causes submodules being not the same.
If two of these instances had equal content - on a module basis - they are still not the same module,
as their position in the global module-resolution-tree is different and therefore causes this very instances
to have different dependencies in the first place.  
So two modules with equal file content are never the same module.

Imagine each NodeJS-module as a node in a directed graph.  
Each node has a set of properties. Properties represent file-content(checksums), module-name, and so on.
A directed edge in this graph represents module access in terms of node's module-resolution-system. Therefore, the graph is not implicit.
This graph is per definition in the format of a directed tree.  
In that graph two nodes are identical, if and only if:  
a) both sets of node properties are equal, and  
b) both sets of all direct and transitive edges form equal complete sub-graphs from tree-root to that node, and  
c) both sets of all direct and transitive edges form equal complete sub-graphs from that node to each accessible leaf.

## Examples

Find an example in [Results Examples](result.md#examples-and-visualisation )
