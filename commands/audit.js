const fs = require('fs');
const path = require('path');
const { getProjectState } = require('../lib/config');

const SEVERITY_ERROR = 'error';
const SEVERITY_WARNING = 'warning';

/**
 * Which layer a file path belongs to (from config layers or inferred).
 * @param {string} relativePath
 * @param {string[]} layers
 * @returns {string|null} e.g. 'components/ui' or 'app' or null
 */
function getLayerForPath(relativePath, layers) {
  const normalized = relativePath.replace(/\\/g, '/');
  for (const layer of layers) {
    if (normalized === layer || normalized.startsWith(layer + '/')) return layer;
  }
  if (normalized.startsWith('app/')) return 'app';
  if (normalized.startsWith('scripts/')) return 'scripts';
  return null;
}

/**
 * Check for forbidden import: fromPath imports toPath.
 * Rules: ui must not import layout/content; content must not import layout; hooks must not import components; scripts never from app/components; runtime never imports scripts.
 */
function isForbiddenImport(fromLayer, toLayer) {
  if (!fromLayer || !toLayer) return false;
  if (toLayer.startsWith('components/ui') && (toLayer.startsWith('components/layout') || toLayer.startsWith('components/content'))) return false;
  if (fromLayer === 'components/ui' && (toLayer === 'components/layout' || toLayer.startsWith('components/layout/') || toLayer === 'components/content' || toLayer.startsWith('components/content/'))) return true;
  if (fromLayer === 'components/content' && (toLayer === 'components/layout' || toLayer.startsWith('components/layout/'))) return true;
  if (fromLayer === 'hooks' && (toLayer.startsWith('components/'))) return true;
  if (fromLayer === 'app' && toLayer === 'scripts') return true;
  if (toLayer === 'scripts') return true; // no runtime file may import scripts
  return false;
}

/**
 * Resolve import target to a layer (e.g. @/components/ui/X -> components/ui).
 */
function resolveImportToLayer(imp, layers) {
  const fromAlias = imp.replace(/^['"]?@\//, '').replace(/['"].*$/, '').trim();
  const parts = fromAlias.split('/');
  if (parts[0] === 'components' && parts[1]) return `components/${parts[1]}`;
  if (parts[0] === 'hooks') return 'hooks';
  if (parts[0] === 'lib') return 'lib';
  if (parts[0] === 'types') return 'types';
  if (parts[0] === 'app') return 'app';
  if (parts[0] === 'scripts') return 'scripts';
  return null;
}

/**
 * Run all audit checks on a file. Returns list of { severity, rule, message, line, fix }.
 */
function auditFile(filePath, content, root, config) {
  const results = [];
  const layers = config.layers || [];
  const fromLayer = getLayerForPath(filePath, [...(layers || []), 'app', 'scripts']);
  const lines = content.split(/\r?\n/);

  lines.forEach((line, i) => {
    const lineNum = i + 1;

    // Raw colors (styling)
    if (/#[0-9a-fA-F]{3,8}\b/.test(line) || /\brgba?\s*\(/.test(line) || /\bhsla?\s*\(/.test(line)) {
      if (!line.trim().startsWith('//') && !line.includes('token') && !line.includes('--')) {
        results.push({
          severity: SEVERITY_ERROR,
          rule: 'no_raw_colors',
          message: 'Raw color value; use a token or Tailwind alias',
          line: lineNum,
          fix: 'Use a semantic token (e.g. text-text-primary, bg-layer-01) or var(--token)',
        });
      }
    }

    // h-screen (layout) — skip if in our own rule message/fix strings or in a regex
    if (/\bh-screen\b/.test(line) && !/message:|fix:/.test(line) && !/\/.*h-screen/.test(line)) {
      results.push({
        severity: SEVERITY_ERROR,
        rule: 'layout_viewport',
        message: 'Use h-dvh instead of h-screen for mobile browser chrome',
        line: lineNum,
        fix: 'Replace h-screen with h-dvh',
      });
    }

    // Relative cross-layer imports (imports)
    const importMatch = line.match(/import\s+.*?\s+from\s+['"](\.\.\/[^'"]+|@\/[^'"]+)['"]/);
    if (importMatch) {
      const spec = importMatch[1];
      if (spec.startsWith('../') && spec.split('/').length >= 3) {
        results.push({
          severity: SEVERITY_WARNING,
          rule: 'import_style',
          message: 'Deep relative import; prefer @/ alias for cross-layer',
          line: lineNum,
          fix: 'Use @/ alias (e.g. import { X } from \'@/components/ui/X\')',
        });
      }
      if (spec.startsWith('@/')) {
        const toLayer = resolveImportToLayer(spec, layers);
        if (toLayer && isForbiddenImport(fromLayer, toLayer)) {
          results.push({
            severity: SEVERITY_ERROR,
            rule: 'forbidden_import',
            message: `Forbidden: ${fromLayer} must not import from ${toLayer}`,
            line: lineNum,
            fix: `Remove or move this import; respect layer boundaries`,
          });
        }
      }
    }

    // scripts import in runtime (any import of scripts/) — skip lines that are the audit check itself
    const hasScriptsImport = !line.includes('line.includes') && (line.includes("from 'scripts/") || line.includes('from "scripts/') || line.includes("from '@/scripts/")) && !line.trim().startsWith('//');
    if (hasScriptsImport) {
      results.push({
        severity: SEVERITY_ERROR,
        rule: 'scripts_build_time_only',
        message: 'Scripts must never be imported at runtime',
        line: lineNum,
        fix: 'Remove this import; use scripts only in build/pipeline',
      });
    }

    // Component-level CSS (architecture)
    if (/import\s+.*\s+from\s+['"]\.\/.*\.(module\.css|\.css)['"]/.test(line) && filePath.includes('components/')) {
      results.push({
        severity: SEVERITY_ERROR,
        rule: 'no_component_css',
        message: 'No component-level CSS files; use Tailwind + global tokens',
        line: lineNum,
        fix: 'Remove the CSS file and use Tailwind utilities + tokens',
      });
    }

    // Magic number spacing/radius (styling)
    if (/\b(24|16|12|8|14|18)px\b/.test(line) && !line.trim().startsWith('//')) {
      if (/style\s*=\s*\{|className.*\d+px|['"]\d+px['"]/.test(line)) {
        results.push({
          severity: SEVERITY_WARNING,
          rule: 'no_magic_numbers',
          message: 'Magic number; use a spacing/radius token',
          line: lineNum,
          fix: 'Use var(--spacing-*) or var(--radius-*) or Tailwind token',
        });
      }
    }
  });

  return results;
}

/**
 * Run full audit. Returns { errors, warnings, filesScanned }.
 * @param {string} [cwd]
 * @param {{ json?: boolean }} [opts]
 */
function runAudit(cwd = process.cwd(), opts = {}) {
  const state = getProjectState(cwd);
  if (!state) {
    return { error: 'No aac.config.yml found. Run `aac init` first.', errors: [], warnings: [], filesScanned: 0 };
  }
  const { root, config, files } = state;
  const errors = [];
  const warnings = [];
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css'];
  const scanFiles = files.filter((f) => codeExtensions.some((ext) => f.endsWith(ext)));

  for (const rel of scanFiles) {
    const abs = path.join(root, rel);
    let content;
    try {
      content = fs.readFileSync(abs, 'utf8');
    } catch (_) {
      continue;
    }
    const issues = auditFile(rel, content, root, config);
    for (const issue of issues) {
      const item = { file: rel, line: issue.line, rule: issue.rule, message: issue.message, fix: issue.fix };
      if (issue.severity === SEVERITY_ERROR) errors.push(item);
      else warnings.push(item);
    }
  }

  if (opts.json) {
    return { errors, warnings, filesScanned: scanFiles.length };
  }
  return { errors, warnings, filesScanned: scanFiles.length, root };
}

module.exports = { runAudit, auditFile, SEVERITY_ERROR, SEVERITY_WARNING };
