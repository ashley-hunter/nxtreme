# Nxtreme

A collection of Nx Plugins to supercharge your Nx developer experience.

## SCSS

Install the package by running the following command:

```bash
npm install @nxtreme/scss --save-dev
```

### Generators

#### Library Generator

Create a SCSS library.

##### Arguments

- `name`: "The name of the SCSS library",
- `tags`: "Add tags to the project (used for linting)",
- `directory`: "A directory where the project is placed",
- `importPath`: "The library name used to import it, like `@myorg/my-awesome-lib`."
- `publishable`: "Create a publishable library."

### Executors

#### Build Generator

##### Options

- `entryFile`: The path to the entry file.
- `outputPath`: The output destination.
- `sourceMap`: Specifies if we should generate source maps.
- `optimization`: Whether to optimize the CSS output.
