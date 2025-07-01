#!/usr/bin/env node
import { driverMain } from "./driverMain.js";

try {
  driverMain(process.argv.slice(2));
  process.exitCode = 0;
} catch (e: unknown) {
  if (e instanceof Error) {
    console.error(`Error: ${e.message}`);
  } else {
    console.error(`Unexpected error: ${e}`);
  }
  process.exitCode = 1;
}
