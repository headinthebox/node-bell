var inherits = require('util').inherits
  , configs = require('./configs')
  , log = require('./util').log
  , Service = require('./service')


function Analyzer(){}
inherits(Analyzer, Service)


Analyzer.prototype.serve = function *() {
  if (!this.ssdb) this.connectSsdb();
  if (!this.beans) yield this.connectBeans('use');
}

exports = module.exports = new Analyzer();
