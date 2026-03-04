const fs = require('fs');
const path = require('path');
const { getProjectState } = require('../lib/config');

/**
 * Extract import specifiers from a line (default + named).
 * @param {string} line
 * @returns {{ specifier: string, isDefault: boolean }[]}
 */
function getImportsFromLine(line) {
  const out = [];
  // default: import X from '...'
  const defaultMatch = line.match(/import\s+(\w+)\s+from\s+['"][^'"]+['"]/);
  if (defaultMatch) out.push({ specifier: defaultMatch[1], isDefault: true });
  // named: import { A, B as C } from '...'
  const namedMatch = line.match(/import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"]/);
  if (namedMatch) {
    const parts = namedMatch[1].split(',').map((s) => s.trim());
    for (const p of parts) {
      const name = p.includes(' as ') ? p.split(/\s+as\s+/)[1].trim() : p;
      out.push({ specifier: name, isDefault: false });
    }
  }
  return out;
}

/**
 * Find all imports and their usage in file content. Returns { imports: { specifier: used } }.
 */
function parseImportsAndUsage(content) {
  const lines = content.split(/\r?\n/);
  const imports = new Map(); // specifier -> false (unused) or true (used)
  const importLines = new Map(); // specifier -> line number

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^\s*import\s+/)) {
      const imps = getImportsFromLine(line);
      for (const { specifier } of imps) {
        imports.set(specifier, false);
        importLines.set(specifier, i + 1);
      }
    }
  }

  // Mark used: specifier appears elsewhere (as identifier or in JSX)
  for (const [spec] of imports) {
    const re = new RegExp(`\\b${spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^\s*import\s+/)) continue;
      if (re.test(line)) {
        imports.set(spec, true);
        break;
      }
    }
  }

  const unused = [];
  imports.forEach((used, spec) => {
    if (!used) unused.push({ specifier: spec, line: importLines.get(spec) });
  });
  return unused;
}

/**
 * Run cleanup scan. Returns unused imports per file, unused components.
 */
function runCleanup(cwd = process.cwd(), opts = {}) {
  const state = getProjectState(cwd);
  if (!state) {
    return { error: 'No aac.config.yml found. Run `aac init` first.', unusedImports: [], unusedComponents: [] };
  }
  const { root, files } = state;
  const codeFiles = files.filter((f) => /\.(tsx?|jsx?)$/.test(f));
  const unusedImports = [];
  const unusedComponents = [];

  for (const rel of codeFiles) {
    const abs = path.join(root, rel);
    let content;
    try {
      content = fs.readFileSync(abs, 'utf8');
    } catch (_) {
      continue;
    }
    const unused = parseImportsAndUsage(content);
    for (const u of unused) {
      unusedImports.push({ file: rel, line: u.line, specifier: u.specifier });
    }
  }

  // Unused components: exported name never referenced in any other file
  const tsxJsx = codeFiles.filter((f) => f.endsWith('.tsx') || f.endsWith('.jsx'));
  for (const rel of tsxJsx) {
    const abs = path.join(root, rel);
    let content;
    try {
      content = fs.readFileSync(abs, 'utf8');
    } catch (_) {
      continue;
    }
    const exported = new Set();
    const baseName = path.basename(rel, path.extname(rel));
    if (content.includes('export default')) exported.add(baseName);
    const defaultNamed = content.match(/export\s+default\s+(?:function\s+(\w+)|(\w+))/);
    if (defaultNamed && (defaultNamed[1] || defaultNamed[2])) exported.add(defaultNamed[1] || defaultNamed[2]);
    const named = content.match(/export\s+(?:function|const|class)\s+(\w+)/g);
    if (named) named.forEach((m) => exported.add(m.replace(/export\s+(?:function|const|class)\s+/, '')));
    for (const name of exported) {
      let refs = 0;
      for (const other of tsxJsx) {
        if (other === rel) continue;
        try {
          const c = fs.readFileSync(path.join(root, other), 'utf8');
          if (new RegExp(`\\b${name}\\b`).test(c)) refs++;
        } catch (_) {}
      }
      if (refs === 0) unusedComponents.push({ file: rel, exportName: name });
    }
  }

  if (opts.json) {
    return { unusedImports, unusedComponents };
  }
  return { unusedImports, unusedComponents, root };
}

module.exports = { runCleanup, parseImportsAndUsage };
