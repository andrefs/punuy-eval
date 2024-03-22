import Experiment, { ExpVars, ExpVarsFixedPrompt, Prompt } from "../experiment";
import { DatasetProfile } from "../../types";
import { DataCorrect, JsonSyntaxError, NoData } from "../../evaluation";
import { distance } from "fastest-levenshtein";

const name = "ds-name-from-ds-sample";
const description =
  "Check if LLM knows a dataset by giving it 10 pairs and asking for 5 more.";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    return {
      id: `${name}-${vars.dataset.id}-prompt`,
      language: "en" as const,
      text:
        `Which semantic measures evaluation dataset do these pairs of concepts belong to?\n` +
        vars.dataset.partitions[0].data
          .slice(0, 10)
          .map(({ term1, term2 }) => `${term1} ${term2}`)
          .join("\n"),
    };
  },
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
};

async function runTrial(
  vars: ExpVarsFixedPrompt,
  schema: any // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  const f = {
    name: "validate_dataset",
    description: "Validates the dataset information.",
    parameters: schema,
  };

  const result = await vars.model.makeRequest(vars.prompt.text, {
    function: f,
  });
  return result;
}

function normalizeString(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .sort()
    .join(" ");
}

function normalizeAuthors(authors: string[]) {
  return authors.map(a =>
    a
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z ]/g, "")
      .split(/\s+/)
      .filter(x => x !== "and" && x.length > 2)
      .sort()
  );
}

async function evaluateTrial(ds: DatasetProfile, data: string) {
  if (!data.trim()) {
    return new NoData();
  }
  try {
    console.log("XXXXXXXXXXXX 1", { ds });
    const normOriginalName = normalizeString(ds.metadata.name);
    console.log("XXXXXXXXXXXX 2", { normOriginalName, data });
    const got = JSON.parse(data);
    console.log("XXXXXXXXXXXX 3", { got });
    const { name, year, authors } = got as {
      name: string;
      year: string;
      authors: string[];
    };
    //const normOriginalYear = ds.metadata.year.slice(0, 4);
    console.log("XXXXXXXXXXXX 4", { name, year, authors });
    const normGotName = normalizeString(name);
    console.log("XXXXXXXXXXXX 5", { normGotName });
    const normGotAuthors = normalizeAuthors(authors);
    console.log("XXXXXXXXXXXX 6", { normGotAuthors });
    //const normGotYear = normalizeString(year);

    const nameDistance = distance(normGotName, normOriginalName);
    console.log("XXXXXXXXXXXX 7", { nameDistance });
    const allAuthorsFound = normGotAuthors.every(gotAuthor =>
      gotAuthor.some(nameWord => normOriginalName.includes(nameWord))
    );
    console.log("XXXXXXXXXXXX 8", { allAuthorsFound });

    console.log({
      name: ds.metadata.name,
      normOriginalName,
      authors,
      normGotAuthors,
      nameDistance,
      allAuthorsFound,
    });

    return new DataCorrect(got);
  } catch (e) {
    return new JsonSyntaxError(data);
  }
}

export default new Experiment(
  name,
  description,
  resultSchema,
  runTrial,
  evaluateTrial,
  [promptGen]
);
