import pino from "pino";

const level = process.env.PINO_LOG_LEVEL || "info";

const transport = pino.transport({
  targets: [
    {
      level,
      target: "pino/file",
      options: { destination: `${__dirname}/../../app.log` },
    },
    {
      level,
      target: "pino-pretty",
    },
  ],
});

export default pino(
  {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);
