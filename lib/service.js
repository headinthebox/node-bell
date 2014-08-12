var events = require('events')
  , inherits = require('util').inherits
  , fivebeans = require('fivebeans')
  , ssdb = require('ssdb')
  , configs = require('./configs')
  , log = require('./util').log
;

function Service() {
  events.EventEmitter.call(this);
}
inherits(Service, events.EventEmitter);


Service.prototype.connectBeans = function *(action) {
  var self = this;
  var client = new fivebeans.client(configs.beanstalkd.host, configs
                                    .beanstalkd.port);
  client.on('connect', function(){
    client[action](configs.beanstalkd.tube, function(err, tube){
      log.info('Beanstalkd connected, using tube %s', tube);
      self.beans = client;
      self.emit('beans connected');
    });
  });

  client.on('error', function(err){
    log.error('Beanstalkd connection error: %s', err);
    if(!self.beans) delete self.beans;
  });

  client.on('close', function(){
    log.info('Beanstalkd connection closed');
  });

  client.connect();

  yield function(done) {self.on('beans connected', done)};
}


Service.prototype.connectSsdb = function () {
  // actually, ssdb is lazy connected
  var options = {port: configs.ssdb.port, host: configs.ssdb.host}
  var client = ssdb.createClient(options);
  client.thunkify();
  this.ssdb = client;
}

exports = module.exports = Service;
