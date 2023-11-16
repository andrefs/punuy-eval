import { DatasetProfile } from "./types";



class Experiment {
  name: string;
  description: string;

  run: (profile: DatasetProfile) => void;

  constructor(name: string, description: string, run: (profile: DatasetProfile) => void) {
    this.name = name;
    this.description = description;
    this.run = run;
  }
}

export default Experiment;

