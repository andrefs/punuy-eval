import { Dataset } from './types';

import Ajv, { JSONSchemaType } from "ajv";
import addFormats from "ajv-formats"
import schemas from '../schema.json';
const ajv = new Ajv();
addFormats(ajv);

//ajv.addSchema(schemas.definitions.Dataset, 'Dataset');




//const schema: JSONSchemaType<Dataset> = schemas.definitions.Dataset;


const validate = ajv
  .addSchema(schemas.definitions.Paper, '#/definitions/Paper')
  .addSchema(schemas.definitions.PartitionData, '#/definitions/PartitionData')
  .addSchema(schemas.definitions.Partition, '#/definitions/Partition')
  .addSchema(schemas.definitions.Metadata, '#/definitions/Metadata')
  .compile<Dataset>(schemas.definitions.Dataset);



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
