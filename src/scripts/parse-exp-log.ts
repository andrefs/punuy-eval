import fs from "fs";
import readline from "readline";
import { Plot, plot } from "nodeplotlib";

async function* readLines(filePath: string) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    yield line;
  }
}

interface ExpLog {
  dpart: string;
  model: string;
  language: string;
  measureType: string;
  jobType: string;
  trials: number;
  pairResults: Record<string, number>;
  converResults: Record<string, number>;
}

// ⚗  Running experiment 0/100: prediction-correlation with variables {"jobType":"allPairs","dpart":"rg65#table1","prompt":"sim-afs-survey-en","model":"gemini-1.5-flash-002","language":"en","measureType":"similarity"}
async function parseExpLog(filePath: string) {
  const lines = readLines(filePath);
  let exp: Partial<ExpLog> = {};
  const exps = [];
  for await (const line of lines) {
    if (line.match(/⚗️ /) && line.match(/Running experiment/)) {
      const json = line.match(/with variables ({.*})/)?.[1];
      if (json) {
        exps.push(exp);
        const data = JSON.parse(json);
        exp = {
          dpart: data.dpart,
          model: data.model,
          language: data.language,
          measureType: data.measureType,
          jobType: data.jobType,
        };
      }
    }
    if (line.match(/🧪\s+Running experiment [-\w]+ (\d+) times/)) {
      const trials = Number(RegExp.$1);
      exp.trials = trials;
    }
    if (line.match(/✔|/) && line.match(/pairs attempt #1 succeeded/)) {
      exp.pairResults = exp.pairResults || {};
      exp.pairResults["success"] = exp.pairResults["success"] ?? 0;
      exp.pairResults["success"] += 1;
    }

    if (
      line.match(/👎|✖/) &&
      line.match(/pairs attempt #\d+ failed: ([-\w]+)/)
    ) {
      exp.pairResults = exp.pairResults || {};
      exp.pairResults[RegExp.$1] = exp.pairResults[RegExp.$1] + 1 || 1;
    }
    // ❗ conversation attempt #2 failed: json-schema-error,json-schema-error,json-schema-error
    if (line.match(/❗\s+conversation attempt #\d+ failed: ([-\w,]+)/)) {
      exp.converResults = exp.converResults || {};
      const errors = RegExp.$1.split(",");
      for (const error of errors) {
        exp.converResults[error] = exp.converResults[error] + 1 || 1;
      }
    }
    if (line.match(/✅\s+conversation attempt #\d+ succeeded/)) {
      exp.converResults = exp.converResults || {};
      exp.converResults["success"] = exp.converResults["success"] ?? 0;
      exp.converResults["success"] += 1;
    }
  }
  if (exp.dpart && exp.model) {
    exps.push(exp);
  }
  return exps;
}

function getResultsPerModel(exps: ExpLog[]) {
  const results: {
    [model: string]: {
      conversationFails: { [error: string]: number };
      pairFails: { [error: string]: number };
      converstationsOk: number;
      pairsOk: number;
    };
  } = {};

  for (const exp of exps) {
    if (!exp.model) {
      continue;
    }

    if (!results[exp.model]) {
      results[exp.model] = {
        conversationFails: {},
        pairFails: {},
        converstationsOk: 0,
        pairsOk: 0,
      };
    }

    if (exp.converResults) {
      for (const fail of Object.keys(exp.converResults)) {
        results[exp.model].conversationFails[fail] =
          results[exp.model].conversationFails[fail] || 0;
        results[exp.model].conversationFails[fail] += exp.converResults[fail];
      }
    }
    if (exp.pairResults) {
      for (const fail of Object.keys(exp.pairResults)) {
        results[exp.model].pairFails[fail] =
          results[exp.model].pairFails[fail] || 0;
        results[exp.model].pairFails[fail] += exp.pairResults[fail];
      }
    }
  }
  return results;
}

const colors = [
  "#1f77b4",
  "#ff7f0e",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];

function plotModelErrors(
  errorsPerModel: Record<
    string,
    {
      conversationFails: { [error: string]: number };
      pairFails: { [error: string]: number };
    }
  >,
  conversationFailTypes: string[],
  pairFailTypes: string[] = [],
  resToColor: Record<string, string>
) {
  const convData: Plot[] = [];
  for (const fail of conversationFailTypes) {
    convData.push({
      x: Object.keys(errorsPerModel),
      y: Object.values(errorsPerModel).map(v => v.conversationFails[fail] || 0),
      type: "bar",
      name: fail,
      marker: {
        color: resToColor[fail],
      },
    });
  }
  plot(convData, {
    title: "Conversation errors per model",
    barmode: "stack",
    yaxis: { title: "Count", type: "log" },
    xaxis: { title: "Model" },
  });

  const pairData: Plot[] = [];
  for (const fail of pairFailTypes) {
    pairData.push({
      x: Object.keys(errorsPerModel),
      y: Object.values(errorsPerModel).map(v => v.pairFails[fail] || 0),
      type: "bar",
      name: fail,
      marker: {
        color: resToColor[fail],
      },
    });
  }
  plot(pairData, {
    title: "Pair errors per model",
    barmode: "stack",
    yaxis: { title: "Count", type: "log" },
    xaxis: { title: "Model" },
  });
}

function assignColor(res: Set<string>, colors: string[]) {
  const succ = "#2ca02c";
  const hash: { [k: string]: string } = {};
  for (const [i, r] of Array.from(res).sort().entries()) {
    if (r === "success") {
      hash[r] = succ;
      continue;
    }
    hash[r] = colors[i % colors.length];
  }
  return hash;
}

async function main() {
  const exps = await parseExpLog(process.argv[2]);
  const { conversationFails, pairFails } = countErrors(exps as ExpLog[]);
  console.log("Conversation errors");
  console.log(conversationFails);
  console.log("Pair errors");
  console.log(pairFails);

  const resultsPerModel = getResultsPerModel(exps as ExpLog[]);
  console.log("Errors per model");
  console.log(resultsPerModel);

  const allRes = new Set([
    ...Object.keys(conversationFails),
    ...Object.keys(pairFails),
  ]);

  plotModelErrors(
    resultsPerModel,
    Object.keys(conversationFails),
    Object.keys(pairFails),
    assignColor(allRes, colors)
  );
}

function countErrors(exps: ExpLog[]) {
  // count errors
  const conversationFails = exps.reduce(
    (acc, exp) => {
      for (const [error, count] of Object.entries(exp.converResults || {})) {
        acc[error] = acc[error] + count || count;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const pairFails = exps.reduce(
    (acc, exp) => {
      for (const [error, count] of Object.entries(exp.pairResults || {})) {
        acc[error] = acc[error] + count || count;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  return { conversationFails, pairFails };
}

main().then(() => console.log("done"));
