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
  TrialData,
  TrialOpts,
  Usages,
} from "./types";
import logger from "../../logger";
import pc from "picocolors";
import { wrapUp } from "./exit";
import { genNextFileIndex } from "./file-index";

/** * Perform a single experiment with the given variables and number of trials.
 * @param vars - The variable combinations to run the experiment with.
 * @param numTrials - The number of trials to run for the variable combination.
 * @param opts - Options for the trials, such as maximum attempts.
 * @returns An object containing the results of the experiment and the total usage.
 * */
export async function perform<T extends GenericExpTypes>(
  this: Experiment<T>,
  vars: ExpVars,
  numTrials: number,
  opts: TrialOpts = { maxTrialAttempts: 3 }
): Promise<ExperimentData<T>> {
  // load cache
  const cache = await this.loadExpCache(vars);
  const useCache = !!cache;
  if (cache && cache.results.raw.length !== numTrials) {
    logger.warn(
      `⚠️  The number of trials (${numTrials}) does not match the number in the cache (${cache.results.raw.length}).`
    );
    throw new Error(
      `The number of trials (${numTrials}) does not match the number in the cache (${cache.results.raw.length}).`
    );
  }

  // get failed pairs from previous runs
  const trialsFailedPairs = cache?.results.raw.map(trial =>
    trial.attempts.length
      ? trial.attempts
          .at(-1)!
          .filter(turn => !turn.ok)
          .flatMap(turn => turn.turnPrompt.pairs)
      : []
  );

  // run trials
  const trialsRes = await this.runTrials(
    vars,
    numTrials,
    trialsFailedPairs || [],
    { ...opts, useCache }
  );
  calcUsageCost(trialsRes.usage);

  const protoExpData = {
    meta: {
      folder: this.folder,
      numTrials,
      name: this.name,
      traceId: this.traceId,
      queryData: this.queryData,
    },
    variables: vars,
  };
  let expData: ExperimentData<T>;

  // no cache, use new trials only
  if (!cache) {
    expData = {
      ...protoExpData,
      usage: trialsRes.usage,
      results: {
        raw: trialsRes.trials,
      },
    };
  } else {
    // merge results from previous runs with this one
    const fullTrials: TrialData<T["Data"]>[] = [];
    const fullUsage: Usages = {};

    for (let i = 0; i < trialsRes.trials.length; i++) {
      const cachedTrial = cache?.results.raw[i];
      const newTrial = trialsRes.trials[i];
      if (!cachedTrial) {
        fullTrials.push(newTrial);
        continue;
      }
      const fullTrialUsage: Usages = {};
      addUsage(fullTrialUsage, cachedTrial.usage);
      addUsage(fullTrialUsage, newTrial.usage);
      addUsage(fullUsage, fullTrialUsage);
      fullTrials.push({
        promptId: newTrial.promptId,
        usage: fullTrialUsage,
        attempts: [...cachedTrial.attempts, ...newTrial.attempts],
      });
    }

    expData = {
      ...protoExpData,
      usage: fullUsage,
      results: {
        raw: fullTrials,
      },
    };
  }

  if (anyTrialWasUnsuccessful(trialsRes.trials)) {
    logger.warn(
      `⚠️  Some trials failed to complete successfully, skipping evaluation and saving results.`
    );
  } else {
    logger.info(
      `✅ All trials completed successfully, proceeding to evaluation.`
    );
    const { evaluation, aggregated } = await this.evaluate(expData);
    expData.results.evaluation = evaluation;
    expData.results.aggregated = aggregated;
  }

  this.printUsage(expData.usage, false);
  await saveExpVarCombData(expData);
  return expData;
}

function anyTrialWasUnsuccessful<T extends GenericExpTypes>(
  trials: TrialData<T>[]
): boolean {
  return trials.some(trial =>
    trial.attempts.some(attempt => attempt.some(turn => !turn.ok))
  );
}

/** * Perform multiple trials for each variable combination in the provided matrix.
 * @param variables - The variable combinations to run the experiments with.
 * @param numTrials - The number of trials to run for each variable combination.
 * @param opts - Options for the trials, such as maximum attempts.
 * @returns An object containing the results of the experiments and the total usage.
 */

export async function performMulti<T extends GenericExpTypes>(
  this: Experiment<T>,
  variables: ExpVarMatrix,
  numTrials: number,
  opts: TrialOpts = { maxTrialAttempts: 3 }
) {
  await this.sanityCheck(this.folder);

  if (!variables?.prompt?.length) {
    variables.prompt = this.prompts;
  }
  const varCombs = splitVarCombsMTL(variables);
  await startUpLogs(this.name, varCombs, numTrials, this.folder);

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
    res.push(await this.perform(vc, numTrials, opts));
    addUsage(this.totalUsage, res[res.length - 1].usage);
  }

  // final wrap-up
  await wrapUp(this, res, this.folder, false);
  return {
    experiments: res,
    usage: this.totalUsage,
  };
}

/** * Log the startup information for the experiment, including the name, variable combinations, number of trials, and folder.
 * @param name - The name of the experiment.
 * @param varCombs - The variable combinations to run the experiment with.
 * @param numTrials - The number of trials to run for each variable combination.
 * @param folder - The folder where the experiment results will be saved.
 **/
async function startUpLogs(
  name: string,
  varCombs: ExpVars[],
  numTrials: number,
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
    }, ${numTrials} times on each variable combination (${numTrials}x${varCombs.length}): \n${varCombs
      .map(vc => "\t" + JSON.stringify(getVarIds(vc)))
      .join(",\n")}.`
  );
  const fnIndex = await genNextFileIndex(folder, [
    /^(?:\d{3}-)?experiment\.json$/,
  ]);
  const logFile = `${fnIndex.toString().padStart(3, "0")}-experiment.log`;
  logger.info(
    `📂 Saving experiment results to folder: ${folder} and 📜 log to ${folder}/${logFile}`
  );
}
