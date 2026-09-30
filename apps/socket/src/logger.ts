import pino from "pino";
import { config } from "./config.js";

export const logger = pino(
  config.NODE_ENV === "production"
    ? {}
    : { transport: { target: "pino-pretty", options: { colorize: true } } },
);
