import {
  convertNxGenerator,
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import * as path from 'path';
import { ComponentGeneratorSchema } from './schema';

function addFiles(tree: Tree, options: ComponentGeneratorSchema) {
  const { sourceRoot } = readProjectConfiguration(tree, options.project);

  const componentDir = joinPathFragments(sourceRoot, getDirectory(options) ?? '');

  const templateOptions = {
    ...options,
    ...names(options.name),
    template: '',
  };
  generateFiles(tree, path.join(__dirname, 'files'), componentDir, templateOptions);
}

export async function componentGenerator(tree: Tree, options: ComponentGeneratorSchema) {
  addFiles(tree, options);
  await formatFiles(tree);
}

function getDirectory(options: ComponentGeneratorSchema): string {
  const { fileName } = names(options.name);

  let baseDir: string;

  if (options.directory) {
    baseDir = options.directory;
  }

  return options.flat ? baseDir : joinPathFragments(baseDir, fileName);
}

export default componentGenerator;
export const componentSchematic = convertNxGenerator(componentGenerator);
