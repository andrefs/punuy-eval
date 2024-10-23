import { renderTable } from "console-table-printer";
import Experiment from ".";
import { calcVarValues, ComparisonGroup, getFixedValueGroup } from "./aux";
import {
  ExperimentData,
  ExpScore,
  ExpVars,
  GenericExpTypes,
  Usages,
} from "./types";
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

export interface CorrVarValues {
  [v1N: string]: {
    [v1V: string | number]: {
      [v2N: string]: Set<string | number>;
    };
  };
}
export function calcCorrVarValues(expScores: ExpScore[]) {
  const cvv: CorrVarValues = {};
  for (const exp of expScores) {
    const varNames = Object.keys(exp.variables);
    for (const v1N of varNames) {
      const v1V = exp.variables[v1N as keyof ExpVars]?.id;
      if (!v1V) {
        continue;
      }
      for (const v2N of varNames) {
        if (v1N === v2N) {
          continue;
        }
        const v2V = exp.variables[v2N as keyof ExpVars]?.id;
        if (!v2V) {
          continue;
        }
        cvv[v1N] = cvv[v1N] || {};
        cvv[v1N][v1V] = cvv[v1N][v1V] || {};
        cvv[v1N][v1V][v2N] = cvv[v1N][v1V][v2N] || new Set();
        cvv[v1N][v1V][v2N].add(v2V);
      }
    }
  }
  return cvv;
}

export function mergeCorrVarNames(
  cvv: CorrVarValues,
  constValueVars: string[]
): Set<string>[] {
  const res = Object.keys(cvv).map(v1N => new Set([v1N]));
  for (let i = 0; i < res.length; i++) {
    if (!res[i]) {
      continue;
    }
    if (constValueVars.includes(Array.from(res[i])[0])) {
      delete res[i];
      continue;
    }
    for (let j = i + 1; j < res.length; j++) {
      if (!res[j]) {
        continue;
      }
      const v2N = Array.from(res[j])[0];

      if (res[i].has(v2N)) {
        continue;
      }
      if (constValueVars.includes(v2N)) {
        delete res[j];
        continue;
      }

      const v1Ns = Array.from(res[i]);
      for (const v1N of v1Ns) {
        for (const v1V of Object.keys(cvv[v1N])) {
          if (cvv[v1N]?.[v1V]?.[v2N]?.size !== 1) {
            continue;
          }
          const v2V = Array.from(cvv[v1N]?.[v1V]?.[v2N])[0];
          if (cvv[v2N]?.[v2V]?.[v1N]?.size === 1) {
            res[i].add(v2N);
            delete res[j];
          }
        }
      }
    }
  }

  return res.filter(r => !!r.size);
}

function varsToStr(vars: Set<string>, variables: ExpVars) {
  return vars.size === 1
    ? variables[Array.from(vars)[0] as keyof ExpVars]!.id
    : Array.from(vars)
      .map(v => [v, variables[v as keyof ExpVars]!.id])
      .map(([v, id]) => `${v}=${id}`)
      .join(", ");
}

export function generateComparisons(
  varValues: { [vn: string]: Set<string> },
  expScores: ExpScore[]
) {
  const comparisons: ComparisonGroup[] = [];
  const constValueVars = Object.keys(varValues).filter(
    vn => varValues[vn].size === 1
  );
  const corrVarValues = calcCorrVarValues(expScores);
  const varNames = mergeCorrVarNames(corrVarValues, constValueVars);

  if (varNames.length === 1) {
    const data = {} as Record<string, Record<string, number | null>>;
    for (const expScore of expScores) {
      const v2Val = varsToStr(varNames[0], expScore.variables);
      const score =
        typeof expScore.score === "number" && !isNaN(expScore.score)
          ? Number(expScore.score.toFixed(3))
          : null;
      data[""] = data[""] || {};
      data[""][v2Val] = score;
    }

    return [
      {
        data,
        fixedValueConfig: constValueVars,
        variables: Array.from(varNames[0]) as (keyof ExpVars)[],
      },
    ];
  }
  for (const [i, v1s] of varNames.entries()) {
    for (const v2s of varNames.slice(i + 1)) {
      const compGroups = [] as ComparisonGroup[];
      const fixedNames = Object.keys(varValues).filter(
        v => !v1s.has(v) && !v2s.has(v)
      );

      for (const expScore of expScores) {
        const v1Val = varsToStr(v1s, expScore.variables);
        const v2Val = varsToStr(v2s, expScore.variables);
        const score =
          typeof expScore.score === "number" && !isNaN(expScore.score)
            ? Number(expScore.score.toFixed(3))
            : null;

        const group = getFixedValueGroup(
          compGroups,
          expScore.variables,
          fixedNames as (keyof ExpVars)[],
          Array.from(v1s) as (keyof ExpVars)[],
          Array.from(v2s) as (keyof ExpVars)[]
        );

        group.data[v1Val] = group.data[v1Val] || {};
        group.data[v1Val][v2Val] = score;
      }
      comparisons.push(...compGroups);
    }
  }
  return comparisons;
}

export function genTable(comp: ComparisonGroup) {
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
  return { csv, table };
}

export function printExpResTable<T extends GenericExpTypes>(
  this: Experiment<T>,
  exps: ExperimentData<T>[]
) {
  if (!this.expDataToExpScore) {
    logger.warn(
      "No expDataToExpScore function defined, skipping printExpResTable"
    );
    return;
  }
  logger.info(`Printing experiment results tables`);
  const expScores = exps.map(e => this.expDataToExpScore!(e));
  const { varValues } = calcVarValues(exps);

  const comparisons = generateComparisons(varValues, expScores);

  for (const comp of comparisons) {
    const { csv, table } = genTable(comp);
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
