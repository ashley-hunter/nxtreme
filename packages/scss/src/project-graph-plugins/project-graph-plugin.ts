import { parseFile } from '@ashley-hunter/sass-graph';
import { ProjectGraph, ProjectGraphBuilder, ProjectGraphProcessorContext } from '@nrwl/devkit';

export function processProjectGraph(
  graph: ProjectGraph,
  context: ProjectGraphProcessorContext
): ProjectGraph {
  const builder = new ProjectGraphBuilder(graph);

  for (const source in context.filesToProcess) {
    for (const file of context.filesToProcess[source]) {
      const ast = parseFile(file.file, {});

      // importLocator.fromFile(
      //   f.file,
      //   (importExpr: string, filePath: string, type: DependencyType) => {
      //     const target = targetProjectLocator.findProjectWithImport(importExpr, f.file);
      //     if (target) {
      //       res.push({
      //         sourceProjectName: source,
      //         targetProjectName: target,
      //         sourceProjectFile: f.file,
      //       });
      //     }
      //   }
      // );
    }
  }

  // We will see how this is used below.
  return builder.getUpdatedProjectGraph();
}
