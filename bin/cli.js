#!/usr/bin/env node

import { Command } from "commander";
import { runInstall, runScan, runStatus, runUninstall } from "../src/installer.js";

const program = new Command();

program
  .name("skill-activate")
  .description("Fix Claude Code skill activation with a forced-eval hook and directive skill descriptions")
  .version("0.1.2");

program
  .command("install")
  .description("Full install (default)")
  .action(async () => {
    await runInstall();
  });

program
  .command("scan")
  .description("List detected skills without modifying files")
  .action(async () => {
    await runScan();
  });

program
  .command("uninstall")
  .description("Remove hook wiring and restore .bak skill files")
  .action(async () => {
    await runUninstall();
  });

program
  .command("status")
  .description("Check whether hook is installed and wired correctly")
  .action(async () => {
    await runStatus();
  });

async function main() {
  try {
    if (process.argv.length <= 2) {
      program.help();
      return;
    }

    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(`skill-activate error: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
