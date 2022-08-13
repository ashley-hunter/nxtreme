import {
  addDependenciesToPackageJson,
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  offsetFromRoot,
  readJsonFile,
  Tree,
  writeJsonFile,
} from '@nrwl/devkit';
import { LibraryGeneratorSchema } from './schema';

interface NormalizedSchema extends LibraryGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
}

function normalizeOptions(
  tree: Tree,
  options: LibraryGeneratorSchema
): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `${getWorkspaceLayout(tree).libsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    importPath: options.importPath ?? '',
    template: '',
  };
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    options.projectRoot,
    templateOptions
  );
}

export default async function (
  tree: Tree,
  options: LibraryGeneratorSchema
): Promise<GeneratorCallback> {
  const normalizedOptions = normalizeOptions(tree, options);
  addProjectConfiguration(tree, normalizedOptions.projectName, {
    root: normalizedOptions.projectRoot,
    projectType: 'library',
    sourceRoot: `${normalizedOptions.projectRoot}/src`,
    targets: {
      build: {
        executor: '@nxtreme/scss:build',
        outputs: ['{options.outputPath}'],
        options: {
          entryFile: joinPathFragments(
            normalizedOptions.projectRoot,
            'src',
            'index.scss'
          ),
          outputPath: joinPathFragments('dist', normalizedOptions.projectRoot),
          sourceMap: true,
        },
      },
    },
    tags: normalizedOptions.parsedTags,
  });
  addFiles(tree, normalizedOptions);

  if (normalizedOptions.publishable && !normalizedOptions.importPath) {
    throw new Error(
      `For publishable libs you have to provide a proper "--importPath" which needs to be a valid npm package name (e.g. my-awesome-lib or @myorg/my-lib)`
    );
  }

  if (!normalizedOptions.publishable) {
    tree.delete(
      joinPathFragments(normalizedOptions.projectRoot, 'package.json')
    );
  }

  const installTask = addDependenciesToPackageJson(
    tree,
    {},
    {
      sass: '^1.54.4',
    }
  );

  addScssMapping(tree, normalizedOptions);

  await formatFiles(tree);

  return installTask;
}

function addScssMapping(tree: Tree, options: NormalizedSchema): void {
  let config: ScssConfig = {};

  if (tree.exists('/.scssrc')) {
    config = readJsonFile<ScssConfig>('/.scssrc');
  }

  config.paths = {
    ...config.paths,
    [options.importPath]: joinPathFragments(options.projectRoot, 'src'),
  };

  writeJsonFile('/.scssrc', config);
}

interface ScssConfig {
  paths?: Record<string, string>;
}
