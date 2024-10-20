import { plot } from "nodeplotlib";

const expCostSamples = [
  {
    modelId: "gemini-1.5-flash-002",
    totalTokens: 135791,
    inputTokens: 104975,
    outputTokens: 30816,
    cost: 0.017117925,
  },
  {
    modelId: "gpt-4o-mini-2024-07-18",
    totalTokens: 198066,
    inputTokens: 104447,
    outputTokens: 93619,
    cost: 0.07183845,
  },
  {
    modelId: "open-mistral-nemo-2407",
    totalTokens: 1030678,
    inputTokens: 607011,
    outputTokens: 423667,
    cost: 0.13398814,
  },
  {
    modelId: "ministral-8b-2410",
    totalTokens: 279085,
    inputTokens: 145741,
    outputTokens: 133344,
    cost: 0.027908500000000003,
  },
  {
    modelId: "ministral-3b-2410",
    totalTokens: 291898,
    inputTokens: 151477,
    outputTokens: 140421,
    cost: 0.011675920000000001,
  },
];

import {
  claude35sonnet_20240620,
  claude3haiku,
  claude3opus,
  claude3sonnet_20240229,
  gemini10pro_001,
  gemini15flash_002,
  gemini15pro_002,
  gpt35turbo_0125,
  gpt4_0613,
  gpt4o_20240806,
  gpt4omini_20240718,
  gpt4turbo_20240409,
  ministral3b_2410,
  ministral8b_2410,
  mistralLarge_2407,
  mistralMedium_2312,
  mistralSmall_2409,
  ModelPricing,
  openMistralNemo_2407,
} from "../lib/models";
import * as datasets from "../lib/dataset-partitions";
const models = [
  // openai
  gpt4o_20240806,
  gpt4omini_20240718,
  gpt4turbo_20240409,
  gpt4_0613,
  gpt35turbo_0125,

  // anthropic
  claude3opus,
  claude3sonnet_20240229,
  claude35sonnet_20240620,
  claude3haiku,

  // mistral
  ministral3b_2410,
  ministral8b_2410,
  mistralSmall_2409,
  mistralMedium_2312,
  mistralLarge_2407,
  openMistralNemo_2407,

  // google
  gemini10pro_001,
  gemini15pro_002,
  gemini15flash_002,
];

interface Cost {
  modelId: string;
  currency: ModelPricing["currency"];
  trialInputCost: number;
  trialOutputCost: number;
  trialTotalCost: number;
}

function calcCost() {
  const trials = 10;

  const avgInputTokens =
    expCostSamples.reduce((acc, s) => acc + s.inputTokens, 0) /
    expCostSamples.length;
  const avgOutputTokens =
    expCostSamples.reduce((acc, s) => acc + s.outputTokens, 0) /
    expCostSamples.length;

  const costs: Cost[] = [];

  for (const model of models) {
    if (!model.pricing) {
      throw new Error(`Model ${model.id} has no pricing`);
    }
    costs.push({
      modelId: model.id,
      currency: model.pricing.currency,
      trialInputCost: model.pricing.input * avgInputTokens,
      trialOutputCost: model.pricing.output * avgOutputTokens,
      trialTotalCost:
        model.pricing.input * avgInputTokens +
        model.pricing.output * avgOutputTokens,
    });
  }

  for (const c of costs.sort((a, b) => b.trialTotalCost - a.trialTotalCost)) {
    console.log(
      `${c.modelId}:\t${c.trialTotalCost * Object.keys(datasets).length * trials}`
    );
  }

  const totalCost = costs.reduce(
    (acc, c) => {
      acc[c.currency] = acc[c.currency] + c.trialTotalCost;
      return acc;
    },
    { $: 0, "€": 0, "£": 0 }
  );

  console.log(
    `\nTOTAL COST (${Object.keys(datasets).length} datasets, ${trials} trials), ${models.length} models:`
  );
  for (const [currency, cost] of Object.entries(totalCost)) {
    console.log(
      `\t${currency}: ${cost * trials * Object.keys(datasets).length}`
    );
  }
}

function plotPricing() {
  plot(
    [
      {
        x: models.map(m => m.pricing!.output),
        y: models.map(m => m.pricing!.input),
        type: "scatter",
        mode: "markers",
        text: models.map(m => m.id),
        name: "Pricing",
      },
    ],
    {
      xaxis: {
        type: "log",
        autorange: true,
        title: "output cost",
      },
      yaxis: {
        type: "log",
        autorange: true,
        title: "input cost",
      },

      title: "Model pricing",
    },
    {
      logging: 0,
    }
  );
}

calcCost();
plotPricing();
