import {
  addDependenciesToPackageJson,
  addProjectConfiguration,
  convertNxGenerator,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  offsetFromRoot,
  TargetConfiguration,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import { jestInitGenerator, jestProjectGenerator } from '@nrwl/jest';
import { Linter, lintProjectGenerator } from '@nrwl/linter';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import {
  getRelativePathToRootTsConfig,
  getRootTsConfigPathInTree,
} from '@nrwl/workspace/src/utilities/typescript';
import * as path from 'path';
import { createEslintJson, extraEslintDependencies } from '../../utils/lint';
import { mitosisCliVersion, mitosisVersion } from '../../utils/versions';
import componentGenerator from '../component/generator';
import { LibraryGeneratorSchema } from './schema';

interface NormalizedSchema extends LibraryGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  rootTsConfigPath: string;
}

function normalizeOptions(tree: Tree, options: LibraryGeneratorSchema): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `${getWorkspaceLayout(tree).libsDir}/${projectDirectory}`;
  const parsedTags = options.tags ? options.tags.split(',').map(s => s.trim()) : [];

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    rootTsConfigPath: getRelativePathToRootTsConfig(tree, projectRoot),
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(tree, path.join(__dirname, 'files'), options.projectRoot, templateOptions);

  if (!options.publishable && !options.buildable) {
    tree.delete(`${options.projectRoot}/package.json`);
  }
}

export async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorSchema
): Promise<GeneratorCallback> {
  const normalizedOptions = normalizeOptions(tree, options);

  if (options.publishable === true && !options.importPath) {
    throw new Error(
      `For publishable libs you have to provide a proper "--importPath" which needs to be a valid npm package name (e.g. my-awesome-lib or @myorg/my-lib)`
    );
  }

  const tasks: GeneratorCallback[] = [];

  addProject(tree, normalizedOptions);
  addFiles(tree, normalizedOptions);

  if (!options.skipTsConfig) {
    updateBaseTsConfig(tree, normalizedOptions);
  }

  if (options.linter === 'eslint') {
    const lintTask = await addLinting(tree, normalizedOptions);
    tasks.push(lintTask);
  }

  if (options.unitTestRunner === 'jest') {
    const jestTask = await addTesting(tree, normalizedOptions);
    tasks.push(jestTask);
  }

  if (options.component) {
    await componentGenerator(tree, {
      name: options.name,
      project: options.name,
      flat: true,
      skipTests: options.unitTestRunner === 'none',
    });
  }

  if (options.publishable || options.buildable) {
    updateLibPackageNpmScope(tree, normalizedOptions);
  }

  const installTask = addDependenciesToPackageJson(
    tree,
    {
      '@builder.io/mitosis': mitosisVersion,
      '@builder.io/mitosis-cli': mitosisCliVersion,
    },
    {}
  );
  tasks.push(installTask);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(...tasks);
}

function addProject(tree: Tree, options: NormalizedSchema) {
  const targets: Record<string, TargetConfiguration> = {};

  if (options.publishable || options.buildable) {
    targets.build = {
      executor: '@nxtreme/mitosis:build',
      outputs: ['{options.outputPath}'],
      options: {
        outputPath: joinPathFragments('dist', options.projectRoot),
        tsConfig: joinPathFragments(options.projectRoot, 'tsconfig.lib.json'),
        entryFile: joinPathFragments(options.projectRoot, 'src', 'index.ts'),
      },
    };
  }

  addProjectConfiguration(
    tree,
    options.name,
    {
      root: options.projectRoot,
      projectType: 'library',
      sourceRoot: joinPathFragments(options.projectRoot, 'src'),
      targets,
      tags: options.parsedTags,
    },
    options.standaloneConfig
  );
}

function updateBaseTsConfig(tree: Tree, options: NormalizedSchema) {
  updateJson(tree, getRootTsConfigPathInTree(tree), json => {
    const c = json.compilerOptions;
    c.paths = c.paths || {};
    delete c.paths[options.name];

    if (c.paths[options.importPath]) {
      throw new Error(
        `You already have a library using the import path "${options.importPath}". Make sure to specify a unique one.`
      );
    }

    c.paths[options.importPath] = [joinPathFragments(options.projectRoot, 'src', 'index.ts')];

    return json;
  });
}

async function addTesting(tree: Tree, options: NormalizedSchema): Promise<GeneratorCallback> {
  const jestInitTask = jestInitGenerator(tree, { compiler: 'tsc' });
  const jestProjectTask = await jestProjectGenerator(tree, {
    project: options.projectName,
    setupFile: 'none',
    compiler: 'tsc',
    supportTsx: true,
    testEnvironment: 'jsdom',
    skipSerializers: true,
  });

  return runTasksInSerial(jestInitTask, jestProjectTask);
}
async function addLinting(tree: Tree, options: NormalizedSchema): Promise<GeneratorCallback> {
  const lintTask = await lintProjectGenerator(tree, {
    linter: Linter.EsLint,
    project: options.projectName,
    tsConfigPaths: [joinPathFragments(options.projectRoot, 'tsconfig.lib.json')],
    eslintFilePatterns: [`${options.projectRoot}/**/*.{ts,tsx,js,jsx}`],
    skipFormat: true,
  });

  const installTask = addDependenciesToPackageJson(
    tree,
    extraEslintDependencies.dependencies,
    extraEslintDependencies.devDependencies
  );

  const eslintJson = createEslintJson(options.projectRoot, options.setParserOptionsProject);

  updateJson(tree, joinPathFragments(options.projectRoot, '.eslintrc.json'), () => eslintJson);

  return runTasksInSerial(lintTask, installTask);
}

function updateLibPackageNpmScope(tree: Tree, options: NormalizedSchema) {
  return updateJson(tree, joinPathFragments(options.projectRoot, 'package.json'), json => {
    json.name = options.importPath;
    return json;
  });
}

export default libraryGenerator;
export const librarySchematic = convertNxGenerator(libraryGenerator);
