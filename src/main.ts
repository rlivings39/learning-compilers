#!/usr/bin/env node
import { driverMain } from "./driverMain.js";

try {
  driverMain(process.argv.slice(2));
  process.exitCode = 0;
} catch (e: any) {
  console.error(`Error: ${e.message}`);
  process.exitCode = 1;
}
