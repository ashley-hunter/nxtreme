import {
  addDependenciesToPackageJson,
  convertNxGenerator,
  formatFiles,
  GeneratorCallback,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import { PackageJson } from 'nx/src/utils/package-json';
import { SetupGeneratorSchema } from './schema';

export async function setupGenerator(
  tree: Tree,
  options: SetupGeneratorSchema
): Promise<GeneratorCallback> {
  const installTask = addDependenciesToPackageJson(
    tree,
    {},
    {
      husky: '^8.0.1',
    }
  );

  updateJson<PackageJson>(tree, 'package.json', json => {
    json.scripts = {
      ...json.scripts,
      prepare: json.scripts?.prepare ? `${json.scripts.prepare} && husky install` : 'husky install',
    };

    return json;
  });

  if (options.precommit) {
    tree.write(
      '.husky/pre-commit',
      `#!/bin/sh
    . "$(dirname "$0")/_/husky.sh"

    nx=./node_modules/@nrwl/cli/bin/nx.js

    if [ -f "$nx" ]; then
      node $nx format:write
    fi`
    );
  }

  if (options.prepush) {
    tree.write(
      '.husky/pre-push',
      `#!/bin/sh
    . "$(dirname "$0")/_/husky.sh"

    nx=./node_modules/@nrwl/cli/bin/nx.js

    if [ -f "$nx" ]; then
      node "$nx" format:check
    fi`
    );
  }

  await formatFiles(tree);

  return installTask;
}

export default setupGenerator;

export const setupSchematic = convertNxGenerator(setupGenerator);
