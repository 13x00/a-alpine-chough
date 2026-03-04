const fs = require('fs');
const path = require('path');
const { getProjectState } = require('../lib/config');

/**
 * Map actual folder structure (top 3 levels) and count files per layer.
 * @param {string} root
 * @param {string[]} files
 * @param {string[]} layers
 * @returns {{ layer: string, count: number, paths: string[] }[]}
 */
function mapLayers(root, files, layers) {
  const byLayer = new Map();
  for (const layer of layers) {
    byLayer.set(layer, []);
  }
  const unclassified = [];

  for (const rel of files) {
    const normalized = rel.replace(/\\/g, '/');
    let found = false;
    for (const layer of layers) {
      if (normalized === layer || normalized.startsWith(layer + '/')) {
        byLayer.get(layer).push(rel);
        found = true;
        break;
      }
    }
    if (!found) {
      if (normalized.startsWith('app/')) {
        if (!byLayer.has('app')) byLayer.set('app', []);
        byLayer.get('app').push(rel);
      } else {
        unclassified.push(rel);
      }
    }
  }

  const result = [];
  for (const [layer, paths] of byLayer) {
    result.push({ layer, count: paths.length, paths });
  }
  result.push({ layer: '(unclassified)', count: unclassified.length, paths: unclassified });
  return result;
}

/**
 * Count files by extension.
 */
function countByExtension(files) {
  const ext = {};
  for (const f of files) {
    const e = path.extname(f) || '(none)';
    ext[e] = (ext[e] || 0) + 1;
  }
  return ext;
}

/**
 * Run overview: map structure vs config layers, file counts, unclassified.
 */
function runOverview(cwd = process.cwd(), opts = {}) {
  const state = getProjectState(cwd);
  if (!state) {
    return { error: 'No aac.config.yml found. Run `aac init` first.', layers: [], byExtension: {} };
  }
  const { root, config, files } = state;
  const layers = config.layers || [];
  const layerMap = mapLayers(root, files, layers);
  const byExtension = countByExtension(files);

  if (opts.json) {
    const uncl = layerMap.find((l) => l.layer === '(unclassified)');
    return {
      project: config.project,
      layers: layerMap.map((l) => ({ layer: l.layer, count: l.count })),
      byExtension,
      unclassified: uncl ? uncl.paths : [],
    };
  }
  return { root, config, layerMap, byExtension };
}

module.exports = { runOverview, mapLayers, countByExtension };
