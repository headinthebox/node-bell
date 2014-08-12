var events = require('events')
  , net = require('net')
  , inherits = require('util').inherits
  , fivebeans = require('fivebeans')
  , bufferpack = require('bufferpack')
  , configs = require('./configs')
  , log = require('./util').log
  , incr = require('./util').incr
;


function Listener() {
  events.EventEmitter.call(this);
}
inherits(Listener, events.EventEmitter);


Listener.prototype.createSocketServer = function *() {
  var self = this;
  var server = net.createServer(function(conn){
    conn.id = incr.next().value;
    log.info('New connection established (id: %d)', conn.id);
    conn.on('end', function(){
      log.info('Client disconnected (id: %d)', conn.id);
    });
    conn.on('data', function(buf) {return self.onRecv(buf)});
  });
  server.listen(configs.listener.port, function(){
    log.info('Listening on port %s..',  server.address().port);
  });
  this.sock = server;
}


Listener.prototype.connectBeans = function *() {
  var self = this;
  var client = new fivebeans.client(configs.beanstalkd.host, configs
                                    .beanstalkd.port);

  client.on('connect', function(){
    client.use(configs.beanstalkd.tube, function(err, tube){
      log.debug('Beanstalkd connected, using tube %s', tube);
      self.beans = client;
      self.emit('beans connected');
    });
  });

  client.on('error', function(err){
    log.error('Beanstalkd connection error: %s', err);
    if(!self.beans) delete self.beans;
  });

  client.on('close', function(){
    log.debug('Beanstalkd connection closed');
  });

  client.connect();

  yield function(done) {self.on('beans connected', done)};
}


Listener.prototype.putJob = function(metric) {
  var job = JSON.stringify(metric);
  return this.beans.put(0, 0, 60, job, function(err, jid){
    // put(priority, delay, ttr, payload, callback)
    if (err) {
      log.warnig('Error on putting job: %s, error: %s', job, err)
    } else {
      log.info('Queued: %s, jobid: %d', job, jid);
    }
  });
}


Listener.prototype.onRecv = function(buf) {
  var i = 0;
  var metrics = [];

  while (i < buf.length) {
    var size = bufferpack.unpack('!I', buf.slice(i, i+4))[0];
    i += 4;
    var body = bufferpack.unpack('!S', buf.slice(i, i+size))[0];
    i += size;
    var chunk = JSON.parse(body);
    Array.prototype.push.apply(metrics, chunk);
  }

  for (var i = 0; i < metrics.length; i++) {
    this.putJob(metrics[i]);
  }
}


Listener.prototype.serve = function *() {
  if (!this.beans) yield this.connectBeans();
  if (!this.sock) yield this.createSocketServer();
}


exports = module.exports = new Listener();
