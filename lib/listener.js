var net = require('net')
  , inherits = require('util').inherits
  , bufferpack = require('bufferpack')
  , minimatch = require('minimatch')
  , configs = require('./configs')
  , log = require('./util').log
  , idm = require('./util').idm
  , Service = require('./service')
;


function Listener() {}
inherits(Listener, Service);


Listener.prototype.createSocketServer = function *() {
  var self = this;

  var server = net.createServer(function(conn){
    conn.id = idm.create();
    log.info('New connection established (id: %d)', conn.id);

    conn.on('end', function(){
      log.info('Client disconnected (id: %d)', idm.remove(conn.id));
    });

    conn.on('data', function(buf) {return self.onRecv(buf)});
  });

  server.listen(configs.listener.port, function(){
    log.info('Listening on port %s..',  server.address().port);
  });

  server.on('error', function(err){
    log.error('Socket error: %s', err);
  });

  this.sock = server;
}


Listener.prototype.putJob = function(metric) {
  var job = JSON.stringify(metric);
  return this.beans.put(0, 0, 60, job, function(err, jid){
    // put(priority, delay, ttr, payload, callback)
    if (err) {
      log.warnig('Error on putting job: %s, error: %s', job, err)
    } else {
      log.info('Queued: %s, job id: %d', job, jid);
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
    var metric = metrics[i];
    if (this.match(metric[0]))
      this.putJob(metric);
  }
}


Listener.prototype.match = function(name) {
  var matches = configs.listener.patterns.matches;
  var ignores = configs.listener.patterns.ignores;

  for (var i = 0; i < matches.length; i++) {
    if (minimatch(name, matches[i])) {
      for (var k = 0; k < ignores.length; k++) {
        if (minimatch(name, ignores[k])) {
          log.debug("'%s' matches ignore pattern '%s'", name, ignores[k]);
          return false;
        }
      }
      return true;
    }
  }
  log.debug("'%s' dosent match any match patterns", name);
  return false;
}


Listener.prototype.serve = function *() {
  if (!this.beans) yield this.connectBeans('use');
  if (!this.sock) yield this.createSocketServer();
}


exports = module.exports = new Listener();
