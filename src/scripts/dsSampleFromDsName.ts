import { DatasetProfile } from "grillo-datasets/src/lib/types";
import { dsSampleFromDsName } from "../lib/experiments";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import { rg65 } from "grillo-datasets";

const sampleFromName = async (ds: DatasetProfile) => {

  console.log('\n\n\nStarting')

  console.log('GPT-3.5 Turbo 1106');
  const gpt35turbo_res = await dsSampleFromDsName.runTrials(1, ds, gpt35turbo);
  let res = await dsSampleFromDsName.validate(ds, gpt35turbo_res);
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');

  console.log('GPT-4 0613');
  const gpt4_res = await dsSampleFromDsName.runTrials(1, ds, gpt4);
  //console.log('XXXXXXXXXXXXXXx', JSON.stringify(gpt4_res, null, 2));
  res = await dsSampleFromDsName.validate(ds, gpt4_res);
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');

  console.log('GPT-4 1106 Preview');
  const gpt4turbo_res = await dsSampleFromDsName.runTrials(1, ds, gpt4turbo);
  //console.log('XXXXXXXXXXXXXXx', JSON.stringify(gpt4turbo_res, null, 2));
  res = await dsSampleFromDsName.validate(ds, gpt4turbo_res);
  console.log(res.ok ? res.type : JSON.stringify(res, null, 2));
  console.log('');
}


sampleFromName(rg65).then(() => {
  console.log('Done');
  process.exit(0);
}
