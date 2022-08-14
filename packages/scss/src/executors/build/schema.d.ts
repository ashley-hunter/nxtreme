export interface BuildExecutorSchema {
  entryFile: string;
  outputPath: string;
  sourceMap: boolean;
  optimization?: boolean;
}
