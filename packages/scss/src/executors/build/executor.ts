import { ensureDir } from 'fs-extra';
import { writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { compile } from 'sass';
import { BuildExecutorSchema } from './schema';

export default async function buildExecutor(options: BuildExecutorSchema) {
  const result = compile(options.entryFile, {
    style: options.optimization ? 'compressed' : 'expanded',
    sourceMap: options.sourceMap,
  });

  const outputFile = join(
    options.outputPath,
    basename(options.entryFile, '.scss') + '.css'
  );
  const sourceMapFile = outputFile + '.map';

  await ensureDir(options.outputPath);
  await writeFile(
    outputFile,
    result.css +
      (options.sourceMap
        ? `/*# sourceMappingURL=${basename(
            options.entryFile,
            '.scss'
          )}.css.map */`
        : '')
  );

  if (options.sourceMap && result.sourceMap) {
    await writeFile(sourceMapFile, JSON.stringify(result.sourceMap));
  }

  return {
    success: true,
  };
}
