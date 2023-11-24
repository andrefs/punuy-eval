import 'dotenv/config';

import {
  compareMc30
} from "./lib/experiments";
import rg65 from 'punuy-datasets/rg65';
import { gpt4, gpt4turbo, gpt35turbo } from './lib/models';
import { DatasetProfile } from './lib/types';
import logger from './lib/logger';

//const compareMC30 = async () => {
//  console.log('\n\n\nStarting')
//  console.log('GPT-3.5 Turbo 1106');
//  const gpt35turbo_res = await compareMc30.run(gpt35turbo);
//  let res = await compareMc30.validate(gpt35turbo_res);
//  console.log('XXXXXXXXXXX', JSON.stringify(gpt35turbo_res, null, 2))
//  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
//  console.log('');
//
//  console.log('GPT-4 0613');
//  const gpt4_res = await compareMc30.run(gpt4);
//  res = await compareMc30.validate(gpt4_res);
//  console.log('XXXXXXXXXXX', JSON.stringify(gpt4_res, null, 2))
//  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
//  console.log('');
//
//  console.log('GPT-4 1106 Preview');
//  const gpt4turbo_res = await compareMc30.run(gpt4turbo);
//  res = await compareMc30.validate(gpt4turbo_res);
//  console.log('XXXXXXXXXXX', JSON.stringify(gpt4turbo_res, null, 2))
//  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
//  console.log('');
//}

nameFromSample(rg65).then(() => {
  console.log('Done');
});
