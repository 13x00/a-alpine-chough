const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { CONFIG_FILENAME, findProjectRoot, loadConfig } = require('../lib/config');

const DEFAULT_LAYERS = [
  'components/ui',
  'components/content',
  'components/layout',
  'components/transition',
  'hooks',
  'lib',
  'types',
];

/**
 * Prompt for a single line of input.
 * @param {string} question
 * @param {string} [defaultValue]
 * @returns {Promise<string>}
 */
function prompt(question, defaultValue = '') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      rl.close();
      resolve((answer && answer.trim()) || defaultValue);
    });
  });
}

/**
 * Resolve path to package templates (works when run from bin or from package root).
 */
function getTemplatesDir() {
  const fromBin = path.join(__dirname, '..', 'templates');
  const fromRoot = path.join(__dirname, '..', 'templates');
  if (fs.existsSync(fromBin)) return fromBin;
  return fromRoot;
}

/**
 * Copy all .mdc files from package templates to .cursor/rules/.
 * @param {string} projectRoot
 */
function copyRuleFiles(projectRoot) {
  const templatesRoot = getTemplatesDir();
  const templatesDir = path.join(templatesRoot, 'rules');
  const rulesDir = path.join(projectRoot, '.cursor', 'rules');
  if (!fs.existsSync(templatesDir)) {
    throw new Error(`Templates rules directory not found: ${templatesDir}`);
  }
  if (!fs.existsSync(rulesDir)) {
    fs.mkdirSync(rulesDir, { recursive: true });
  }
  const entries = fs.readdirSync(templatesDir, { withFileTypes: true });
  let copied = 0;
  for (const ent of entries) {
    if (ent.isFile() && ent.name.endsWith('.mdc')) {
      const src = path.join(templatesDir, ent.name);
      const dest = path.join(rulesDir, ent.name);
      fs.copyFileSync(src, dest);
      copied++;
    }
  }
  return copied;
}

/**
 * Scaffold aac.config.yml with project name, stack, and layers.
 * @param {string} projectRoot
 * @param {string} projectName
 * @param {string} stack
 * @param {string[]} [layers]
 */
function scaffoldConfig(projectRoot, projectName, stack, layers = DEFAULT_LAYERS) {
  const config = {
    project: projectName,
    stack: stack,
    layers: layers,
    rules: {
      no_cross_layer_imports: true,
      enforce_naming_conventions: true,
      no_raw_colors: true,
      no_magic_numbers: true,
      max_file_lines: 300,
    },
  };
  const yaml = require('js-yaml');
  const content = yaml.dump(config, { lineWidth: -1 });
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  fs.writeFileSync(configPath, `# a-alpine-chough — single source of truth for architecture\n# Edit layers and rules here. Rule files in .cursor/rules/ reference this file.\n\n${content}`, 'utf8');
}

/**
 * Run init: prompt, copy rules, scaffold config.
 * @param {object} [opts] - { projectName, stack } to skip prompts
 * @returns {Promise<{ rulesCopied: number, configPath: string }>}
 */
async function runInit(opts = {}) {
  const cwd = process.cwd();
  const existingRoot = findProjectRoot(cwd);
  const projectRoot = existingRoot || cwd;

  let projectName = opts.projectName;
  let stack = opts.stack;
  if (projectName === undefined || stack === undefined) {
    const pkgPath = path.join(projectRoot, 'package.json');
    let defaultName = '';
    let defaultStack = 'Next.js App Router';
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        defaultName = pkg.name || path.basename(projectRoot);
      } catch (_) {
        defaultName = path.basename(projectRoot);
      }
    } else {
      defaultName = path.basename(projectRoot);
    }
    if (projectName === undefined) projectName = await prompt('Project name', defaultName);
    if (stack === undefined) stack = await prompt('Stack', defaultStack);
  }

  const rulesCopied = copyRuleFiles(projectRoot);
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  const alreadyHadConfig = fs.existsSync(configPath);
  if (!alreadyHadConfig) {
    scaffoldConfig(projectRoot, projectName, stack);
  }

  return { rulesCopied, configPath, alreadyHadConfig };
}

module.exports = { runInit, copyRuleFiles, scaffoldConfig, getTemplatesDir };
