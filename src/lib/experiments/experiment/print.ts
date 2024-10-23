import { renderTable } from "console-table-printer";
import Experiment from ".";
import { calcVarValues, ComparisonGroup, getFixedValueGroup } from "./aux";
import { ExperimentData, GenericExpTypes, Usages } from "./types";
import logger from "src/lib/logger";

export function printUsage<T extends GenericExpTypes>(
  this: Experiment<T>,
  usage: Usages | undefined,
  final?: boolean
) {
  if (!usage) {
    return;
  }
  logger.info(
    "📈💸 " +
    (final ? "Final usage" : "Usage") +
    " estimate:\n" +
    Object.values(usage)
      .map(u => `\t${JSON.stringify(u)} `)
      .join("\n")
  );
}

export function printExpResTable<T extends GenericExpTypes>(
  this: Experiment<T>,
  exps: ExperimentData<T>[]
) {
  if (!this.expDataToExpScore) {
    return;
  }
  const expScores = exps.map(e => this.expDataToExpScore!(e));
  const { varNames } = calcVarValues(exps);

  const comparisons: ComparisonGroup[] = [];
  for (const [i, v1] of varNames.entries()) {
    for (const v2 of varNames.slice(i + 1)) {
      //if (varValues[v1].size === 1 && varValues[v2].size === 1) {
      //  continue;
      //}

      let compGroups = [] as ComparisonGroup[];
      const fixedNames = varNames.filter(v => v !== v1 && v !== v2);

      for (const expScore of expScores) {
        const v1Val = expScore.variables[v1]!.id;
        const v2Val = expScore.variables[v2]!.id;
        const score =
          typeof expScore.score === "number" && !isNaN(expScore.score)
            ? Number(expScore.score.toFixed(3))
            : null;

        const group = getFixedValueGroup(
          compGroups,
          expScore.variables,
          fixedNames,
          v1,
          v2
        );

        group.data[v1Val] = group.data[v1Val] || {};
        group.data[v1Val][v2Val] = score;
      }

      if (compGroups.length > 1) {
        // keep only groups with more than one value for each variable
        compGroups = compGroups.filter(
          g =>
            Object.keys(g.data).length > 1 &&
            Object.keys(g.data).every(k => Object.keys(g.data[k]).length > 1)
        );
      }

      comparisons.push(...compGroups);
    }
  }

  for (const comp of comparisons) {
    let csv = "";
    const columnNames: { [key: string]: boolean } = {};
    const rowNames: { [key: string]: boolean } = {};
    const table = [];
    for (const [v1, v2s] of Object.entries(comp.data)) {
      rowNames[v1] = true;
      for (const v2 of Object.keys(v2s)) {
        columnNames[v2] = true;
      }
      table.push({ "(index)": v1, ...v2s });
    }
    csv += "," + Object.keys(columnNames).sort().join(",") + "\n";
    for (const rN of Object.keys(rowNames).sort()) {
      const line = [rN.toString()];
      for (const cN of Object.keys(columnNames).sort()) {
        line.push(comp.data[rN][cN]?.toString() || "");
      }
      csv += line.join(",") + "\n";
    }
    const tablePP = renderTable(table);
    logger.info(
      `🆚 Comparing ${comp.variables
        .map(v => `[${v}]`)
        .join(" and ")} with fixed variables ${JSON.stringify(
          comp.fixedValueConfig
        )} \n${tablePP} \n${csv} `
    );
  }
}
