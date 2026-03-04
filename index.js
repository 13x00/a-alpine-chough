/**
 * a-alpine-chough — programmatic API
 * All commands can be run from Node as well as via the CLI.
 */

const init = require('./commands/init');
const audit = require('./commands/audit');
const cleanup = require('./commands/cleanup');
const overview = require('./commands/overview');
const migrate = require('./commands/migrate');
const config = require('./lib/config');

module.exports = {
  init,
  audit,
  cleanup,
  overview,
  migrate,
  config,
};
