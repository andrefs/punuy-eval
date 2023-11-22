import { DatasetProfile } from "grillo-datasets/src/lib/types";
import { dsSampleFromDsName } from "../lib/experiments";
import { gpt35turbo, gpt4, gpt4turbo } from "../lib/models";
import { rg65 } from "grillo-datasets";

const sampleFromName = async (ds: DatasetProfile) => {

  console.log('\n\n\nStarting')

  const gpt35turbo_res = await dsSampleFromDsName.perform(10, ds, gpt35turbo);
  const gpt4_res = await dsSampleFromDsName.perform(10, ds, gpt4);
  const gpt4turbo_res = await dsSampleFromDsName.perform(10, ds, gpt4turbo);

  console.log('gpt35turbo_res', gpt35turbo_res.combinedResult.avg);
  console.log('gpt4_res', gpt4_res.combinedResult.avg);
  console.log('gpt4turbo_res', gpt4turbo_res.combinedResult.avg);
}


sampleFromName(rg65).then(() => {
  console.log('Done');
  process.exit(0);
});
