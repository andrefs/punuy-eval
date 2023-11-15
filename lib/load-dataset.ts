
import Ajv2020 from "ajv/dist/2020";
import { JTDDataType } from "ajv/dist/jtd";
import addFormats from "ajv-formats"
const ajv = new Ajv2020();
addFormats(ajv)

import * as dsSchema from '../sm-dataset.schema.json';
type SmDataset = JTDDataType<typeof dsSchema>;

const validate = ajv.compile<SmDataset>(dsSchema);

export default async function loadDataset(name: string) {
  const fileName = /\.json$/.test(name) ? name : `${name}.json`;
  const { default: dataset } = await import(`../datasets/${fileName}`, { assert: { type: 'json' } });

  if (!validate(dataset)) {
    console.log('Dataset is invalid');
    console.log(validate.errors);
    throw 'Dataset is invalid';
  }
  console.log('Dataset is valid');
  console.log(dataset);
}

loadDataset('rg65').then(() => console.log('done')).catch(console.error);


