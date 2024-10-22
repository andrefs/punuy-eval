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
  pairFails: Record<string, number>;
  pairsOk: number;
  conversationFails: Record<string, number>;
  conversationsOk: number;
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
    if (line.match(/✔/) && line.match(/pairs attempt #1 succeeded/)) {
      exp.pairsOk = exp.pairsOk ?? 0;
      exp.pairsOk += 1;
    }

    if (line.match(/👎\s+pairs attempt #\d+ failed: ([-\w]+)/)) {
      exp.pairFails = exp.pairFails || {};
      exp.pairFails[RegExp.$1] = exp.pairFails[RegExp.$1] + 1 || 1;
    }
    // ❗ conversation attempt #2 failed: json-schema-error,json-schema-error,json-schema-error
    if (line.match(/❗\s+conversation attempt #\d+ failed: ([-\w,]+)/)) {
      exp.conversationFails = exp.conversationFails || {};
      const errors = RegExp.$1.split(",");
      for (const error of errors) {
        exp.conversationFails[error] = exp.conversationFails[error] + 1 || 1;
      }
    }
    if (line.match(/✅\s+conversation attempt #\d+ succeeded/)) {
      exp.conversationsOk = exp.conversationsOk ?? 0;
      exp.conversationsOk += 1;
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

    if (exp.conversationsOk) {
      results[exp.model].converstationsOk += exp.conversationsOk;
    }
    if (exp.conversationFails) {
      for (const fail of Object.keys(exp.conversationFails)) {
        results[exp.model].conversationFails[fail] =
          exp.conversationFails[fail];
      }
    }
    if (exp.pairsOk) {
      results[exp.model].pairsOk += exp.pairsOk;
    }
    if (exp.pairFails) {
      for (const fail of Object.keys(exp.pairFails)) {
        results[exp.model].pairFails[fail] = exp.pairFails[fail];
      }
    }
  }
  return results;
}

function plotModelErrors(
  errorsPerModel: Record<
    string,
    {
      conversationFails: { [error: string]: number };
      pairFails: { [error: string]: number };
    }
  >,
  conversationFailTypes: string[],
  pairFailTypes: string[] = []
) {
  const convData: Plot[] = [];
  for (const fail of conversationFailTypes) {
    convData.push({
      x: Object.keys(errorsPerModel),
      y: Object.values(errorsPerModel).map(v => v.conversationFails[fail] || 0),
      type: "bar",
      name: fail,
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
    });
  }
  plot(pairData, {
    title: "Pair errors per model",
    barmode: "stack",
    yaxis: { title: "Count", type: "log" },
    xaxis: { title: "Model" },
  });
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

  //plotModelErrors(
  //  errorsPerModel,
  //  Object.keys(conversationFails),
  //  Object.keys(pairFails)
  //);
}

function countErrors(exps: ExpLog[]) {
  // count errors
  const conversationFails = exps.reduce(
    (acc, exp) => {
      for (const [error, count] of Object.entries(
        exp.conversationFails || {}
      )) {
        acc[error] = acc[error] + count || count;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const pairFails = exps.reduce(
    (acc, exp) => {
      for (const [error, count] of Object.entries(exp.pairFails || {})) {
        acc[error] = acc[error] + count || count;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  return { conversationFails, pairFails };
}

main().then(() => console.log("done"));
