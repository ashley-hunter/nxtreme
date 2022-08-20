import { readJson, Tree, updateJson } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { PackageJson } from 'nx/src/utils/package-json';
import { setupGenerator } from './generator';
import { SetupGeneratorSchema } from './schema';

describe('setup generator', () => {
  let appTree: Tree;
  const options: SetupGeneratorSchema = { precommit: true, prepush: true };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
  });

  it('should add the package', async () => {
    await setupGenerator(appTree, options);
    const json = readJson<PackageJson>(appTree, 'package.json');

    expect(json.devDependencies?.husky).toBe('^8.0.1');
  });

  it('should add the prepare script', async () => {
    await setupGenerator(appTree, options);
    const json = readJson<PackageJson>(appTree, 'package.json');

    expect(json.scripts?.prepare).toBe('husky install');
  });

  it('should add the prepare script to and existing prepare script', async () => {
    updateJson(appTree, 'package.json', json => {
      json.scripts = {
        prepare: 'nx dep-graph',
      };
      return json;
    });
    await setupGenerator(appTree, options);
    const json = readJson<PackageJson>(appTree, 'package.json');

    expect(json.scripts?.prepare).toBe('nx dep-graph && husky install');
  });

  it('should add the pre-commit script', async () => {
    await setupGenerator(appTree, options);
    expect(appTree.read('.husky/pre-commit', 'utf-8')).toMatchSnapshot();
  });

  it('should add the pre-push script', async () => {
    await setupGenerator(appTree, options);
    expect(appTree.read('.husky/pre-push', 'utf-8')).toMatchSnapshot();
  });
});
