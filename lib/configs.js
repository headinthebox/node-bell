/*
 * Configs hub
 */

var fs = require('fs')
  , toml = require('toml')
  , util = require('./util')
;

var content = fs.readFileSync(util.path.configs);
exports = module.exports = toml.parse(content.toString());
