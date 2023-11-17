import 'dotenv/config';

import loadDataset from "./lib/load-dataset";
import { dsSampleFromDsName, dsPaperFromDsName, dsSampleFromDsSample } from "./lib/experiments";
import { gpt4, gpt4turbo, gpt35turbo } from './lib/models';

const dsId = 'rg65';

const sampleFromName = async () => {
  const ds = await loadDataset(dsId);

  console.log('\n\n\nStarting')

  console.log('GPT-3.5 Turbo 1106');
  const gpt35turbo_res = await dsSampleFromDsName.run(ds, gpt35turbo);
  //console.log('XXXXXXXXXXXXXXx', JSON.stringify(gpt35turbo_res, null, 2));
  let res = await dsSampleFromDsName.validate(ds, gpt35turbo_res);
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');

  console.log('GPT-4 0613');
  const gpt4_res = await dsSampleFromDsName.run(ds, gpt4);
  //console.log('XXXXXXXXXXXXXXx', JSON.stringify(gpt4_res, null, 2));
  res = await dsSampleFromDsName.validate(ds, gpt4_res);
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');

  console.log('GPT-4 1106 Preview');
  const gpt4turbo_res = await dsSampleFromDsName.run(ds, gpt4turbo);
  //console.log('XXXXXXXXXXXXXXx', JSON.stringify(gpt4turbo_res, null, 2));
  res = await dsSampleFromDsName.validate(ds, gpt4turbo_res);
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');
}

const paperFromName = async () => {
  const ds = await loadDataset(dsId);

  console.log('\n\n\nStarting')
  console.log('GPT-3.5 Turbo 1106');
  const gpt35turbo_res = await dsPaperFromDsName.run(ds, gpt35turbo);
  let res = await dsPaperFromDsName.validate(ds, gpt35turbo_res);
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');

  console.log('GPT-4 0613');
  const gpt4_res = await dsPaperFromDsName.run(ds, gpt4);
  res = await dsPaperFromDsName.validate(ds, gpt4_res);
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');

  console.log('GPT-4 1106 Preview');
  const gpt4turbo_res = await dsPaperFromDsName.run(ds, gpt4turbo);
  res = await dsPaperFromDsName.validate(ds, gpt4turbo_res);
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');
}

const run = async () => {
  const ds = await loadDataset(dsId);

  console.log('\n\n\nStarting')
  console.log('GPT-3.5 Turbo 1106');
  const gpt35turbo_res = await dsSampleFromDsSample.run(ds, gpt35turbo);
  let res = await dsSampleFromDsSample.validate(ds, gpt35turbo_res);
  console.log('XXXXXXXXXXX', JSON.stringify(gpt35turbo_res, null, 2))
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');

  console.log('GPT-4 0613');
  const gpt4_res = await dsSampleFromDsSample.run(ds, gpt4);
  res = await dsSampleFromDsSample.validate(ds, gpt4_res);
  console.log('XXXXXXXXXXX', JSON.stringify(gpt4_res, null, 2))
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');

  console.log('GPT-4 1106 Preview');
  const gpt4turbo_res = await dsSampleFromDsSample.run(ds, gpt4turbo);
  res = await dsSampleFromDsSample.validate(ds, gpt4turbo_res);
  console.log('XXXXXXXXXXX', JSON.stringify(gpt4turbo_res, null, 2))
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');
}

run().then(() => {
  console.log('Done');
});
