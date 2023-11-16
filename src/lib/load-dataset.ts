import { DatasetProfile } from './types';

import Ajv from "ajv";
import addFormats from "ajv-formats"
const ajv = new Ajv();
addFormats(ajv);

import schemas from '../../schema.json';
ajv.addSchema(schemas)

const validate = ajv.compile<DatasetProfile>(schemas.definitions.Dataset);



export default async function loadDataset(name: string) {
  const fileName = /\.json$/.test(name) ? name : `${name}.json`;
  const { default: dataset } = await import(`../../datasets/${fileName}`, { assert: { type: 'json' } });


  if (!validate(dataset)) {
    console.log('Dataset is invalid');
    console.log(validate.errors);
    throw 'Dataset is invalid';
  }
  console.log('Dataset is valid');
  console.log(dataset);

  return dataset;
}

