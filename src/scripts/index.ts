import loadDataset from "../lib/load-dataset";

const dsName = 'rg65';

loadDataset(dsName).then((ds) => {
  console.log(ds);
});
