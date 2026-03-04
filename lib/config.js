const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONFIG_FILENAME = 'aac.config.yml';

const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  '.cursor',
  'coverage',
  '.turbo',
  '*.min.js',
  '*.min.css',
];

/**
 * Find project root by walking up from cwd until aac.config.yml is found.
 * @param {string} [startDir=process.cwd()]
 * @returns {string|null} Absolute path to project root or null
 */
function findProjectRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  while (dir !== root) {
    const configPath = path.join(dir, CONFIG_FILENAME);
    if (fs.existsSync(configPath)) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Load and parse aac.config.yml from a directory.
 * @param {string} projectRoot
 * @returns {object|null} Parsed config or null
 */
function loadConfig(projectRoot) {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return yaml.load(raw) || {};
  } catch (err) {
    return null;
  }
}

/**
 * Check if a path segment matches an ignore pattern (e.g. 'node_modules' or '*.min.js').
 * @param {string} segment
 * @param {string[]} ignoreList
 * @returns {boolean}
 */
function isIgnoredSegment(segment, ignoreList) {
  for (const pattern of ignoreList) {
    if (pattern.startsWith('*.')) {
      if (segment.endsWith(pattern.slice(1))) return true;
    } else if (segment === pattern || segment.startsWith(pattern + path.sep)) {
      return true;
    }
  }
  return false;
}

/**
 * Load ignore list from .gitignore and merge with default ignore.
 * @param {string} projectRoot
 * @returns {string[]}
 */
function loadIgnoreList(projectRoot) {
  const out = [...DEFAULT_IGNORE];
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return out;
  const content = fs.readFileSync(gitignorePath, 'utf8');
  const lines = content.split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean);
  for (const line of lines) {
    const stripped = line.replace(/^\//, '').replace(/\/$/, '');
    if (stripped && !out.includes(stripped)) out.push(stripped);
  }
  return out;
}

/**
 * Walk directory and return relative file paths (respecting ignore list).
 * @param {string} dir - Absolute path
 * @param {string} projectRoot - Absolute project root (for relative paths)
 * @param {string[]} ignoreList
 * @param {string[]} [extensions] - e.g. ['.ts', '.tsx', '.js', '.jsx']. If omitted, all files included.
 * @returns {string[]} Relative paths from project root
 */
function walkFiles(dir, projectRoot, ignoreList, extensions) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const relative = path.relative(projectRoot, full);
    const segments = relative.split(path.sep);
    if (segments.some((s) => isIgnoredSegment(s, ignoreList))) continue;
    if (ent.isDirectory()) {
      results.push(...walkFiles(full, projectRoot, ignoreList, extensions));
    } else if (ent.isFile()) {
      if (!extensions || extensions.some((ext) => ent.name.endsWith(ext))) {
        results.push(relative);
      }
    }
  }
  return results;
}

/**
 * Get config and list of project files for scanning.
 * @param {string} [cwd=process.cwd()]
 * @param {string[]} [extensions] - e.g. ['.ts', '.tsx', '.js', '.jsx', '.css']
 * @returns {{ root: string, config: object, files: string[], ignoreList: string[] }|null}
 */
function getProjectState(cwd = process.cwd(), extensions = ['.ts', '.tsx', '.js', '.jsx', '.css']) {
  const root = findProjectRoot(cwd);
  if (!root) return null;
  const config = loadConfig(root) || {};
  const ignoreList = loadIgnoreList(root);
  const files = walkFiles(root, root, ignoreList, extensions);
  return { root, config, files, ignoreList };
}

module.exports = {
  CONFIG_FILENAME,
  findProjectRoot,
  loadConfig,
  loadIgnoreList,
  walkFiles,
  getProjectState,
};
