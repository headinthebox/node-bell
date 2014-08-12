var configs = require('./configs')
  , events = require('events')
  , fivebeans = require('fivebeans')
  , log = require('./util').log
  , inherits = require('util').inherits
;

function Listener() {
   events.EventEmitter.call(this);
}
inherits(Listener, events.EventEmitter);


Listener.prototype.connectBeans = function *() {
  var self = this;
  var client = new fivebeans.client(configs.beanstalkd.host,
                                    configs.beanstalkd.port);
  client
    .on('connect', function() {
      client.use(configs.beanstalkd.tube, function(err, tube){
        log.debug('Beanstalkd connected, using tube %s', tube);
        self.beans = client;
        self.emit('beans connected');
      });
    })
    .on('error', function(err) {
      log.error('Beanstalkd connection error: %s', err);
      delete self.beans;
    })
    .on('close', function(){
      log.debug('Beanstalkd connection closed');
    })
    .connect();

  // wait for connection established
  yield function(done) {self.on('beans connected', done)};
}


Listener.prototype.putJob = function(metric) {
  var job = JSON.stringify(metric);
  return this.beans.put(0, 0, 60, job, function(err, jobid){
    if (err) {
      log.warning('Error on putting job: %s, %s', job, err);
    } else {
      log.info('Queued: %s', job);
    }
  });
}


Listener.prototype.serve = function *() {
  if(!this.beans) yield this.connectBeans();
  var self = this;
  this.putJob(['name', [1, 1.1]])
}


exports = module.exports = new Listener();
