// Copyright (c) 2014 Eleme, Inc. https://github.com/eleme/node-bell
//
// Usage: bell <service> [options]
//
// Options:
//
//   -h, --help            output usage information
//   -V, --version         output the version number
//   -c, --configs <c>     configs file path
//   -l, --log-level <l>   logging level (1~5 for debug~critical)
//   -s, --sample-configs  generate sample configs

var co = require('co')
  , path = require('path')
  , program = require('commander')
  , toml = require('toml')
  , configs = require('./lib/configs')
  , listener = require('./lib/listener')
  , analyzer = require('./lib/analyzer')
  , util = require('./lib/util');

var log = util.log;


function parseLogLevel(val) {
  return (parseInt(val) - 1) % 5  + 1;  // limit to 1~5
}


co(function *(){
  program
    .version('0.0.1')
    .usage('<service> [options]')
    .option('-c, --configs-path <c>', 'configs file path')
    .option('-l, --log-level <l>', 'logging level (1~5 for critical~debug)', parseLogLevel)
    .option('-s, --sample-configs', 'generate sample configs file')
    .parse(process.argv);

  // set log level
  log.level = util.logLevels[program.logLevel || 4];

  // generate sample configs file
  if (program.sampleConfigs) {
    util.copy(util.path.configs, 'sample.configs.toml');
    log.info('Generate sample.configs.toml done.')
    return
  }

  // update configs
  var configsPath = program.configsPath || util.path.configs;
  var content = yield util.readFile(configsPath)
  util.updateNestedObjects(configs, toml.parse(content.toString()));

  // reterve service name
  var name = program.args[0];
  if (!name) program.help();

  var service = {
    listener: listener, analyzer: analyzer
  }[name];

  if (!service) program.help();
  else yield service.serve();
})();
