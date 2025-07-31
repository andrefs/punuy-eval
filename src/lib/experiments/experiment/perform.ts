import Experiment from ".";
import {
  addUsage,
  calcUsageCost,
  getVarIds,
  saveExpVarCombData,
  splitVarCombsMTL,
} from "./aux";
import {
  ExperimentData,
  ExpVarMatrix,
  ExpVars,
  GenericExpTypes,
  TrialOpts,
} from "./types";
import logger from "../../logger";
import pc from "picocolors";
import { wrapUp } from "./exit";

export async function perform<T extends GenericExpTypes>(
  this: Experiment<T>,
  vars: ExpVars,
  trials: number,
  traceId: number,
  opts: TrialOpts = {
    maxConvAttempts: 3,
    maxTurnRetries: 3,
  }
): Promise<ExperimentData<T>> {
  const trialsRes = await this.runTrials(vars, trials, opts);
  calcUsageCost(trialsRes.usage);
  const expData: ExperimentData<T> = {
    meta: {
      folder: this.folder,
      trials,
      name: this.name,
      traceId: traceId ?? Date.now(),
      queryData: this.queryData,
    },
    variables: vars,
    usage: trialsRes.usage,
    results: {
      raw: trialsRes.trials,
    },
  };
  const { evaluation, aggregated } = await this.evaluate(expData);
  expData.results.evaluation = evaluation;
  expData.results.aggregated = aggregated;

  this.printUsage(expData.usage, false);
  await saveExpVarCombData(expData);
  return expData;
}

export async function performMulti<T extends GenericExpTypes>(
  this: Experiment<T>,
  variables: ExpVarMatrix,
  trials: number,
  opts: TrialOpts = {
    maxConvAttempts: 3,
    maxTurnRetries: 3,
  }
) {
  await this.sanityCheck(this.folder);

  if (!variables?.prompt?.length) {
    variables.prompt = this.prompts;
  }
  const varCombs = splitVarCombsMTL(variables);
  startUpLogs(this.name, varCombs, trials, this.folder);

  // main loop
  const res = [] as ExperimentData<T>[];
  this.handleEarlyExit(res, this.folder);
  for (const [index, vc] of varCombs.entries()) {
    logger.info(
      "⚗️  " +
        pc.inverse(
          `Running experiment ${index + 1}/${varCombs.length}: ${this.name}`
        ) +
        ` with variables ${JSON.stringify(getVarIds(vc))}.`
    );
    res.push(await this.perform(vc, trials, Date.now(), opts));
    addUsage(this.totalUsage, res[res.length - 1].usage);
  }

  // final wrap-up
  await wrapUp(this, res, this.folder, false);
  return {
    experiments: res,
    usage: this.totalUsage,
  };
}

function startUpLogs(
  name: string,
  varCombs: ExpVars[],
  trials: number,
  folder: string
) {
  if (!varCombs?.length) {
    logger.error(
      "🧐 No variable combinations to run experiments with, aborting."
    );
    throw "🧐 No variable combinations to run experiments with, aborting.";
  }
  logger.info(
    `🔬 Preparing to run experiment ${
      name
    }, ${trials} times on each variable combination (${trials}x${varCombs.length}): \n${varCombs
      .map(vc => "\t" + JSON.stringify(getVarIds(vc)))
      .join(",\n")}.`
  );
  logger.info(
    `📂 Saving experiment results to folder: ${folder} and 📜 log to ${folder}/experiment.log`
  );
}
