import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  offsetFromRoot,
  TargetConfiguration,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import {
  getRelativePathToRootTsConfig,
  getRootTsConfigPathInTree,
} from '@nrwl/workspace/src/utilities/typescript';
import * as path from 'path';
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

export default async function (tree: Tree, options: LibraryGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);

  if (options.publishable === true && !options.importPath) {
    throw new Error(
      `For publishable libs you have to provide a proper "--importPath" which needs to be a valid npm package name (e.g. my-awesome-lib or @myorg/my-lib)`
    );
  }

  addProject(tree, normalizedOptions);
  updateBaseTsConfig(tree, normalizedOptions);
  addFiles(tree, normalizedOptions);

  await formatFiles(tree);
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
      sourceRoot: `${options.projectRoot}/src`,
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

    const { libsDir } = getWorkspaceLayout(tree);

    c.paths[options.importPath] = [
      joinPathFragments(libsDir, `${options.projectDirectory}/src/index.ts`),
    ];

    return json;
  });
}
