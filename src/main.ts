#!/usr/bin/env node
import { driverMain } from "./driverMain.js";

try {
  driverMain(process.argv.slice(2));
} catch (e: any) {
  console.error(e.message);
  process.exitCode = 1;
}

process.exitCode = 0;
