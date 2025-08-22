#!/usr/bin/env node
import { driverMain } from "./driverMain.js";
import { NotccError } from "./errors.js";

try {
  driverMain(process.argv.slice(2));
  process.exitCode = 0;
} catch (e: unknown) {
  process.exitCode = 1;
  if (e instanceof NotccError) {
    console.error(`Error: ${e.message}`);
  } else {
    // Unknown or unexpected error. Just reraise it so
    // as not to swallow stacks for bugs
    throw e;
  }
}
