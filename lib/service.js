var events = require('events')
  , inherits = require('util').inherits
  , fivebeans = require('fivebeans')
  , thunkify = require('thunkify')
  , ssdb = require('ssdb')
  , configs = require('./configs')
  , log = require('./util').log
;

function Service() {
  events.EventEmitter.call(this);
}
inherits(Service, events.EventEmitter);


Service.prototype.connectBeans = function *(action) {  // action: use/watch
  var host = configs.beanstalkd.host
    , port = configs.beanstalkd.port
    , tube = configs.beanstalkd.tube
  ;

  var self = this;
  var beans = this.beans = new fivebeans.client(host, port);

  beans.on('connect', function(){
    beans[action](tube, function(e, _) {
      log.info("Beanstalkd connected, %s tube '%s'", action, tube);
      self.emit('beans connected');
    });
  })
  .connect();
  yield function(done) {self.on('beans connected', done)};
}


Service.prototype.connectSsdb = function () {
  var options = {port: configs.ssdb.port, host: configs.ssdb.host}
  var client = ssdb.createClient(options);
  client.thunkify()
  this.ssdb = client;
}

exports = module.exports = Service;
