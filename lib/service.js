var events = require('events')
  , inherits = require('util').inherits
  , fivebeans = require('fivebeans')
  , ssdb = require('ssdb')
  , configs = require('./configs')
  , patches = require('./util').patches
  , log = require('./util').log
;

function Service() { events.EventEmitter.call(this) };
inherits(Service, events.EventEmitter);

Service.prototype.createBeansClient = function(){
  var host = configs.beanstalkd.host
    , port = configs.beanstalkd.port
  ;
  this.beans = new fivebeans.client(host, port);
  patches.patchBeansClient(this.beans);
  return this.beans;
}

Service.prototype.connectBeans = function *(action) {
  var self = this
    , beans = this.beans
    , tube = configs.beanstalkd.tube
    , action = action || 'use'  // use/watch
    , _action = {use: 'using', watch: 'watching'}[action]
  ;

  beans.on('connect', function(){
    beans[action](tube, function(e, _){
      log.info("Beanstalkd connected, %s tube '%s'", _action, tube);
      self.emit('beans connected');
    });
  }).connect();

  yield function(done) {self.on('beans connected', done)};
}

Service.prototype.createSsdbClient = function() {
  var options = {port: configs.ssdb.port, host: configs.ssdb.host};
  this.ssdb = ssdb.createClient(options).thunkify();
  return this.ssdb;
}

exports = module.exports = Service;
