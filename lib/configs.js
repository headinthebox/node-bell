/*
 * Configs hub
 */

var fs = require('fs');
var toml = require('toml');
var util = require('./util');

var content = fs.readFileSync(util.path.configs);
exports = module.exports = toml.parse(content.toString());
