import { ensureDir } from 'fs-extra';
import { writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { compile } from 'sass';
import { BuildExecutorSchema } from './schema';

export default async function buildExecutor(options: BuildExecutorSchema) {
  const result = compile(options.entryFile, {
    importers: [],
    style: 'expanded',
    sourceMap: options.sourceMap,
  });

  const outputFile = join(options.outputPath, basename(options.entryFile));
  const sourceMapFile = outputFile + '.map';

  await ensureDir(options.outputPath);
  await writeFile(outputFile, result.css);

  if (options.sourceMap && result.sourceMap) {
    await writeFile(sourceMapFile, result.sourceMap.sources[0]);
  }

  return {
    success: true,
  };
}
