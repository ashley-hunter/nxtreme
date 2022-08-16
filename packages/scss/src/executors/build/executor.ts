import { ensureDir } from 'fs-extra';
import { writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { compile } from 'sass';
import { BuildExecutorSchema } from './schema';

export default async function buildExecutor(options: BuildExecutorSchema) {
  await compileStylesheet(options.entryFile, options.outputPath, {
    sourceMap: options.sourceMap,
  });

  if (options.optimization) {
    await compileStylesheet(options.entryFile, options.outputPath, {
      sourceMap: options.sourceMap,
      minify: true,
    });
  }

  return {
    success: true,
  };
}

async function compileStylesheet(
  entryFile: string,
  outputPath: string,
  options: CompileOptions
): Promise<void> {
  const result = compile(entryFile, {
    style: options.minify ? 'compressed' : 'expanded',
    sourceMap: options.sourceMap,
  });

  const filename = basename(entryFile, '.scss');

  const outputFile = join(outputPath, filename + options.minify ? '.min.css' : '.css');
  const sourceMapFile = outputFile + '.map';

  await ensureDir(outputPath);

  await writeFile(
    outputFile,
    result.css + (options.sourceMap ? `/*# sourceMappingURL=${sourceMapFile} */` : '')
  );

  if (options.sourceMap && result.sourceMap) {
    await writeFile(sourceMapFile, JSON.stringify(result.sourceMap));
  }
}

interface CompileOptions {
  sourceMap?: boolean;
  minify?: boolean;
}
