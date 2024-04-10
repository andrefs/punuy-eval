import Experiment, { ExpVars, ExpVarsFixedPrompt, Prompt } from "../experiment";
import {
  JsonSchemaError,
  JsonSyntaxError,
  NoData,
  NonEvaluatedData,
} from "../../evaluation";
import Ajv, { JSONSchemaType } from "ajv";
import { DsPartition } from "../../dataset-adapters/DsPartition";
const ajv = new Ajv();

const name = "ds-name-from-ds-sample";
const description =
  "Check if LLM knows a dataset by giving it 10 pairs and asking for 5 more.";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => ({
    id: `${name}-${vars.dpart.id}-prompt`,
    language: "en" as const,
    text:
      `Which semantic measures evaluation dataset do these pairs of concepts belong to?\n` +
      vars.dpart.data
        .slice(0, 10)
        .map(({ term1, term2 }) => `${term1} ${term2}`)
        .join("\n"),
  }),
};
const resultSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
    },
    year: {
      type: "string",
    },
    authors: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: ["name", "year", "authors"],
};
type ResultSchema = JSONSchemaType<typeof resultSchema>;
const validateSchema = ajv.compile<ResultSchema>(resultSchema);

async function runTrial(
  vars: ExpVarsFixedPrompt,
  schema: any // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  const f = {
    name: "validate_dataset",
    description: "Validates the dataset information.",
    schema,
  };

  const result = await vars.model.makeRequest(vars.prompt.text, {
    function: f,
  });
  return result;
}

async function evaluateTrial(dpart: DsPartition, data: string) {
  if (!data.trim()) {
    return new NoData();
  }
  try {
    const got = JSON.parse(data);
    if (!validateSchema(got)) {
      return new JsonSchemaError(data);
    }
    return new NonEvaluatedData({
      originalName: dpart.dataset.metadata.name,
      originalYear: dpart.dataset.metadata.date.slice(0, 4),
      gotName: got.name,
      gotYear: got.year,
      gotAuthors: got.authors,
    } as DsNameFromDsSampleResult);
  } catch (e) {
    return new JsonSyntaxError(data);
  }
}

interface DsNameFromDsSampleResult {
  originalName: string;
  originalYear: string;
  originalAuthors: string[];
  gotName: string;
  gotYear: string;
  gotAuthors: string[];
}

export default new Experiment(
  name,
  description,
  resultSchema,
  runTrial,
  evaluateTrial,
  [promptGen]
);
