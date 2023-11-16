
export class LLM {
  id: string;

  init: (params: any) => void;

  askCompletion: (prompt: string,) => void;

  constructor(id: string, init: (params: any) => void, askCompletion: (prompt: string,) => void) {
    this.id = id;
    this.init = init;
    this.askCompletion = askCompletion;
  }



}
