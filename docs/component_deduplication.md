# Component Deduplication

Read [NodeJS internals](nodejs_internals.md) first.

NPM does the needed graph de-duplications internally already when it generates the affective module layout in the file-system.  
See [`npm dedupe` docs](https://github.com/npm/cli/blob/latest/docs/lib/content/commands/npm-dedupe.md).

Idea: Additional logic how module de-deduplication could be done will come to the conclusion that
it is either invalid per definition, due to the previously described rules of graph/node identity that applies here,
or that it is unnecessary, because it was already done by NPM.

This idea shall be falsified.  
See [Milestone: after-the-fact component deduplication](https://github.com/CycloneDX/cyclonedx-node-npm/milestone/2)  
See [Discussion: describe how component de-duplication works](https://github.com/CycloneDX/cyclonedx-node-npm/discussions/307)  
