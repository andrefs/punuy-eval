import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  GenericExpTypes,
  Prompt,
  TrialResult,
} from "../experiment";
import { DataCorrect, DataIncorrect, ValidData } from "../../evaluation";
import { distance } from "fastest-levenshtein";
import { DsPartition } from "../../dataset-adapters/DsPartition";
import { Static, Type } from "@sinclair/typebox";

const name = "ds-paper-from-ds-name";
const description =
  "Check if LLM can, when given a dataset name, identify the scientific paper describing it";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const year = vars.dpart.dataset.metadata.date.substring(0, 4);
    return {
      id: `${name}-${vars.dpart.id}-prompt`,
      language: "en" as const,
      text: `${vars.dpart.dataset.metadata.name} is a semantic measure gold standard dataset, published in ${year}. Please return the title of the scientific article describing this dataset.`,
    };
  },
};
const queryResponseSchema = Type.Object({
  title: Type.String(),
});

interface ExpTypes extends GenericExpTypes {
  Data: Static<typeof queryResponseSchema>;
  Evaluation: { titles: string[] };
  DataSchema: typeof queryResponseSchema;
}

async function runTrial(
  this: Experiment<ExpTypes>,
  vars: ExpVarsFixedPrompt,
  schema: ExpTypes["DataSchema"],
  maxRetries: number = 3
): Promise<TrialResult<ExpTypes["Data"]>> {
  const params = {
    function: {
      name: "return-paper-name",
      description:
        "Return the title of the scientific article describing this dataset",
      schema,
    },
  };

  const gotValidData = false;
  let attempts = 0;
  const failedAttempts = [];
  while (!gotValidData && attempts < maxRetries) {
    const attemptResult = await this.getResponse(
      vars.model,
      vars.prompt.text,
      params
    );
    attempts++;
    if (attemptResult instanceof ValidData) {
      const res: TrialResult<ExpTypes["Data"]> = {
        totalTries: attempts,
        failedAttempts,
        ok: true,
        result: attemptResult,
      };
      return res;
    }
    failedAttempts.push(attemptResult);
  }

  const res: TrialResult<ExpTypes["Data"]> = {
    totalTries: attempts,
    failedAttempts,
    ok: false,
  };
  return res;
}

async function evaluateTrial(dpart: DsPartition, got: ExpTypes["Data"]) {
  const expected = dpart.dataset.metadata.papers.map(p => ({
    title: p.title,
  }));

  let bestScore = 1;
  // let bestIndex = -1

  for (const [, exp] of expected.entries()) {
    const e = exp.title.toLowerCase().trim();
    const g = got.title.toLowerCase().trim();
    const d = distance(e, g) / ((e.length + g.length) / 2);
    if (d < bestScore) {
      bestScore = d;
      // bestIndex = i
    }
  }

  const threshold = 0.2;
  if (bestScore < threshold) {
    return new DataCorrect(
      { title: got.title },
      { titles: expected.map(e => e.title) }
    );
  }
  return new DataIncorrect(
    { title: got.title },
    { titles: expected.map(e => e.title) }
  );
}

export default new Experiment(
  name,
  description,
  queryResponseSchema,
  runTrial,
  evaluateTrial,
  [promptGen]
);
