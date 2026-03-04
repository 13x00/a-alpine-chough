#!/usr/bin/env node

const { Command } = require('commander');
const init = require('../commands/init');
const audit = require('../commands/audit');
const cleanup = require('../commands/cleanup');
const overview = require('../commands/overview');
const migrate = require('../commands/migrate');

const program = new Command();

program
  .name('aac')
  .description('a-alpine-chough — architecture governance for Cursor projects')
  .version(require('../package.json').version);

program
  .command('init')
  .description('Initialize config and install rule files into .cursor/rules/')
  .option('--project-name <name>', 'Project name (skips prompt)')
  .option('--stack <stack>', 'Stack e.g. Next.js App Router (skips prompt)')
  .action(async (opts) => {
    try {
      const result = await init.runInit({
        projectName: opts.projectName,
        stack: opts.stack,
      });
      if (result.alreadyHadConfig) {
        console.log('aac.config.yml already exists; left unchanged.');
      }
      console.log(`Copied ${result.rulesCopied} rule file(s) to .cursor/rules/`);
      if (!result.alreadyHadConfig) {
        console.log('Created', result.configPath);
      }
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  });

program
  .command('audit')
  .description('Run architecture audit — violations by severity with file, line, fix')
  .option('--json', 'Output JSON (CI-friendly)')
  .action((opts) => {
    const result = audit.runAudit(process.cwd(), { json: opts.json });
    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify({ errors: result.errors, warnings: result.warnings, filesScanned: result.filesScanned }));
      process.exit(result.errors.length > 0 ? 1 : 0);
    }
    console.log('## Audit Report\n');
    if (result.errors.length) {
      console.log('### ❌ Errors (fix before committing)');
      result.errors.forEach((e) => console.log(`- \`${e.file}\` line ${e.line} — ${e.rule} — ${e.message} — ${e.fix}`));
      console.log('');
    }
    if (result.warnings.length) {
      console.log('### ⚠️ Warnings (should fix)');
      result.warnings.forEach((w) => console.log(`- \`${w.file}\` line ${w.line} — ${w.rule} — ${w.message} — ${w.fix}`));
      console.log('');
    }
    console.log('### ✅ Summary');
    console.log(`- Files scanned: ${result.filesScanned}`);
    console.log(`- ${result.errors.length} errors, ${result.warnings.length} warnings`);
    console.log('');
    process.exit(result.errors.length > 0 ? 1 : 0);
  });

program
  .command('cleanup')
  .description('Find unused components, props, imports, state')
  .option('--json', 'Output JSON')
  .action((opts) => {
    const result = cleanup.runCleanup(process.cwd(), { json: opts.json });
    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify({ unusedImports: result.unusedImports, unusedComponents: result.unusedComponents }));
      return;
    }
    console.log('## Cleanup Report\n');
    if (result.unusedImports.length) {
      console.log('### Unused imports');
      result.unusedImports.forEach((u) => console.log(`- ${u.file} line ${u.line} — \`${u.specifier}\``));
      console.log('');
    }
    if (result.unusedComponents.length) {
      console.log('### Unused components');
      result.unusedComponents.forEach((u) => console.log(`- ${u.file} — \`${u.exportName}\` never imported`));
      console.log('');
    }
    if (!result.unusedImports.length && !result.unusedComponents.length) {
      console.log('No unused imports or components found.');
    }
  });

program
  .command('overview')
  .description('Map folder structure against layers in aac.config.yml')
  .option('--json', 'Output JSON')
  .action((opts) => {
    const result = overview.runOverview(process.cwd(), { json: opts.json });
    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify({
        project: result.project,
        layers: result.layers,
        byExtension: result.byExtension,
        unclassified: result.unclassified,
      }));
      return;
    }
    const projectName = result.config?.project || 'project';
    console.log(`## Structure Overview — ${projectName}\n`);
    console.log('### Layers');
    for (const l of result.layerMap) {
      const mark = l.layer === '(unclassified)' ? '?' : '✔';
      console.log(`${mark} ${l.layer.padEnd(28)} — ${l.count} files`);
    }
    console.log('\n### File types');
    for (const [ext, count] of Object.entries(result.byExtension).sort((a, b) => b[1] - a[1])) {
      console.log(`${ext.padEnd(8)} ${count}`);
    }
    const uncl = result.layerMap.find((l) => l.layer === '(unclassified)');
    if (uncl && uncl.paths.length) {
      console.log('\n### Unclassified (review)');
      uncl.paths.slice(0, 15).forEach((p) => console.log(`- ${p}`));
      if (uncl.paths.length > 15) console.log(`... and ${uncl.paths.length - 15} more`);
    }
  });

program
  .command('migrate')
  .description('Generate step-by-step migration plan; saves to .cursor/plans/')
  .option('--from <name>', 'Migrating from (e.g. "pages router")')
  .option('--to <name>', 'Migrating to (e.g. "app router")')
  .action((opts) => {
    const result = migrate.runMigrate(process.cwd(), { from: opts.from, to: opts.to });
    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
    console.log('Migration plan written to', result.planPath);
    console.log('Run the steps in order and use the verification checklist after each step.');
  });

program.parse();
