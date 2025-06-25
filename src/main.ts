import { driverMain } from "./driverMain.js";

try {
  driverMain(process.argv.slice(2));
} catch (e) {
  console.log(e);
  process.exitCode = 1;
}

process.exitCode = 0;
