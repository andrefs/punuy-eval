import Experiment from ".";
import { saveExperimentsData } from "./aux";
import { ExperimentData, GenericExpTypes } from "./types";
import logger from "../../logger";

export async function wrapUp<T extends GenericExpTypes>(
  exp: Experiment<T>,
  res: ExperimentData<T>[],
  folder: string,
  exitedEarly: boolean
) {
  exp.exitedEarly = exitedEarly;
  await saveExperimentsData(
    exp.name,
    res,
    exp.totalUsage,
    folder,
    exp.exitedEarly
  );
  console.log("XXXXXXXXXXXXX", exp);
  if (exp.expDataToExpScore) {
    exp.printExpResTable(res);
  }
  exp.printUsage(exp.totalUsage, true);
}

export async function handleEarlyExit<T extends GenericExpTypes>(
  this: Experiment<T>,
  res: ExperimentData<T>[],
  folder: string
) {
  const self = this; // eslint-disable-line @typescript-eslint/no-this-alias
  let callCount = 0;
  process.on("uncaughtException", async function (err) {
    logger.error(
      `🛑 Uncaught exception: ${err}, saving results and exiting early.`
    );
    await wrapUp(self, res, folder, true);
    process.exit(1);
  });
  for (const signal of ["SIGINT", "SIGTERM", "SIGQUIT"] as const) {
    process.on(signal, async function () {
      if (callCount < 1) {
        logger.error(
          `🛑 Received ${signal} signal, saving results and exiting early.`
        );
        await wrapUp(self, res, folder, true);
        process.exit(1);
      }
      callCount++;
    });
  }
}
