import { combineEvaluations } from "src/lib/evaluation";
import Experiment from ".";
import { ExperimentData, GenericExpTypes } from "./types";
import { Value } from "@sinclair/typebox/value";

export async function evaluate<T extends GenericExpTypes>(
  this: Experiment<T>,
  exp: ExperimentData<T>
) {
  const trialEvaluationResults = await Promise.all(
    exp.results.raw.map(trial => {
      const turnData = trial.attempts.flatMap(attempt =>
        attempt.flatMap(turn =>
          turn.ok ? [{ prompt: turn.turnPrompt, data: turn.result?.data }] : []
        )
      );
      return this.evaluateTrial(exp.variables.dpart, turnData);
    })
  );
  return {
    evaluation: trialEvaluationResults,
    aggregated: this.customCombineEvals
      ? await this.customCombineEvals(trialEvaluationResults)
      : await combineEvaluations(trialEvaluationResults),
  };
}

export function validateSchema<T extends GenericExpTypes>(
  this: Experiment<T>,
  value: unknown
) {
  return Value.Check(this.queryData.responseSchema, value);
}
