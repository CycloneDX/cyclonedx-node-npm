# Expected outcome for various setups/options

Integration tests are run by [`integration/cli.from-setups.test`](../../../../integration/cli.from-setups.test.js).  
Test results are stored in [`sbom_dummy-results/`](../../../sbom_dummy-results/).

Cases and expected results:
- `bare` - includes ALL dependencies, nesting components according to file system structure - which reflects the package resolution tree.
- `flat` - includes ALL dependencies, no nesting.
- `omit-dev` - includes ALL dependencies, EXCEPT (direct or transitive) dependencies that are only used for development
- `omit-dev-optional` - includes ALL dependencies, EXCEPT (direct or transitive) dependencies that are only used for development or are marked as optional
- `omit-dev-optional-peer` - includes ALL dependencies, EXCEPT (direct or transitive) dependencies that are only used for development or are marked as optional or marked as peer
- `omit-dev-peer` - includes ALL dependencies, EXCEPT (direct or transitive) dependencies that are only used for development or are marked as peer
- `omit-optional` - includes ALL dependencies, EXCEPT (direct or transitive) dependencies that are only marked as optional 
- `omit-optional-peer` - includes ALL dependencies, EXCEPT (direct or transitive) dependencies that are only marked as optional or as peer
- `omit-peer` - includes ALL dependencies, EXCEPT (direct or transitive) dependencies that are only marked as peer
- `package-lock-only` - includes ALL dependencies, based on lockfile information only - meaning no licenses, nor manifest data
- `with-licenses` - includes ALL dependencies, and their respective license texts.
