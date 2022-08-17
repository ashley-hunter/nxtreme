export interface LibraryGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  linter: 'eslint' | 'none';
  unitTestRunner: 'jest' | 'none';
  skipFormat?: boolean;
  publishable?: boolean;
  buildable?: boolean;
  importPath?: string;
  component?: boolean;
  strict: boolean;
  setParserOptionsProject: boolean;
  standaloneConfig?: boolean;
  skipTsConfig?: boolean;
  frameworks?: string;
}
