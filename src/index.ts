import 'dotenv/config';

import loadDataset from "./lib/load-dataset";
import datasetAwareness from "./lib/experiments/datasetAwareness";
import { gpt4, gpt4turbo, gpt35turbo } from './lib/models';

const dsId = 'rg65';

const run = async () => {
  const ds = await loadDataset(dsId);

  console.log('\n\n\nStarting')
  console.log('GPT-3.5 Turbo 1106');
  const gpt35turbo_res = await datasetAwareness.run(ds, gpt35turbo);
  let res = await datasetAwareness.validate(ds, gpt35turbo_res);
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');

  console.log('GPT-4 0613');
  const gpt4_res = await datasetAwareness.run(ds, gpt4);
  res = await datasetAwareness.validate(ds, gpt4_res);
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');

  console.log('GPT-4 1106 Preview');
  const gpt4turbo_res = await datasetAwareness.run(ds, gpt4turbo);
  res = await datasetAwareness.validate(ds, gpt4turbo_res);
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');
}

run().then(() => {
  console.log('Done');
});