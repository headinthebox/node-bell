/* Realtime anomalies detection based on statsd, for periodic time series.
 * Copyright (c) 2014 Eleme, Inc. https://github.com/eleme/node-bell
 *
 * Usage: bell <service> [options]
 *
 * Options:
 *
 *   -h, --help            output usage information
 *   -V, --version         output the version number
 *   -c, --configs <c>     configs file path
 *   -l, --log-level <l>   logging level (1~5 for debug~critical)
 *   -s, --sample-configs  generate sample configs
 *
 * Data flow:
 *
 *  [statsd]
 *     |
 *     v        send to queue
 * [listener] -----------------> [beanstalkd]
 *                                   |
 *                                   | reserve
 *             history metrics       v       record anomalies
 *             ---------------> [analyzers] ----------------
 *             |                     |                     |
 *             |                     | put to ssdb         |
 *             |                     v                     |
 *             ------------------- [ssdb] <-----------------
 *                                   |
 *                                   |
 *                                   v
 *                                [webapp]
 */


var co = require('co')
  , fs = require('fs')
  , program = require('commander')
  , toml = require('toml')
  , analyzer = require('./lib/analyzer')
  , configs = require('./lib/configs')
  , listener = require('./lib/listener')
  , webapp = require('./lib/webapp')
  , util = require('./lib/util')
  , log = util.log
;

co(function *(){
  program
  .version('0.1.2')
  .usage('<service> [options]')
  .option('-c, --configs-path <c>', 'configs file path')
  .option('-s, --sample-configs', 'generate sample configs file')
  .option('-l, --log-level <l>', 'logging level (1~5 for critical~debug)', function(val){
    return (parseInt(val, 10) - 1) % 5 + 1;
  })
  .parse(process.argv);

  log.level = util.logLevels[program.logLevel || 4];

  if (program.sampleConfigs) {
    log.info('Generate sample.configs.toml to current directory');
    return util.copy(util.path.configs, 'sample.configs.toml');
  }

  var configsPath = program.configsPath || util.path.configs;
  var content = fs.readFileSync(configsPath).toString();
  util.updateNestedObjects(configs, toml.parse(content));

  var name = program.args[0];
  if (!name) program.help();

  var service = {listener: listener, analyzer: analyzer, webapp: webapp}[name];
  if (!service) program.help();
  else yield service.serve();
})();
