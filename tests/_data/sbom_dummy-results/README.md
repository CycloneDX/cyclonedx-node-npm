# SBOM Dummy Test Results

This directory contains SBOM test snapshots used for integration testing.

The files are compared during testing, and are created during testing on first occurrence.
This means that deleting the files causes them to be re-created.

## Directory Structure

- `bare/` - Original snapshots with all dependencies (including optional dependencies)
- `flat/` - Original snapshots for flattened components
- `with-licenses/` - Original snapshots with license texts included

- `bare_no_optional/` - Snapshots without optional dependencies
- `flat_no_optional/` - Flattened snapshots without optional dependencies
- `with-licenses_no_optional/` - License snapshots without optional dependencies

## Testing Strategy

The test system uses different snapshots depending on the context:

1. For XML validation tests: Original snapshots with optional dependencies are used
2. For all other tests: Snapshots without optional dependencies are used

This approach allows testing both scenarios:
- Standard operation with all dependencies
- Secure operation with vulnerable optional dependencies omitted

## Security Note

The `*_no_optional` snapshots were created to address a security vulnerability in `libxmljs2`, which is an optional dependency of `@cyclonedx/cyclonedx-library`. By using these alternative snapshots, we can test the package with optional dependencies omitted.
