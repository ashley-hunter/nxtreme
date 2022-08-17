export interface ComponentGeneratorSchema {
  name: string;
  project: string;
  skipTests: boolean;
  directory?: string;
  flat: boolean;
}
