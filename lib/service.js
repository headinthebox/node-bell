/* The based service function*/

var events = require('events');
var inherits = require('util').inherits;
var fivebeans = require('fivebeans');
var ssdb = require('ssdb');
var configs = require('./configs');
var patches = require('./util').patches;
var log = require('./util').log;
var fatal = require('./util').fatal;


/*
 * the basic service function
 */

function Service() {
  events.EventEmitter.call(this);
}

inherits(Service, events.EventEmitter);


/*
 * create this service a beanstalkd client
 */

Service.prototype.createBeansClient = function(){
  var host = configs.beanstalkd.host;
  var port = configs.beanstalkd.port;

  this.beans = new fivebeans.client(host, port);
  patches.patchBeansClient(this.beans);
  return this.beans;
};


/*
 * connect beanstalkd the sync like way
 */
Service.prototype.connectBeans = function *(action) {
  action = action || 'use';  // use/watch

  var self = this;
  var beans = this.beans;
  var tube = configs.beanstalkd.tube;
  var _action = {use: 'using', watch: 'watching'}[action];

  beans.on('connect', function(){
    beans[action](tube, function(e, _){
      log.info("Beanstalkd connected, %s tube '%s'", _action, tube);
      self.emit('beans connected');
    });
  }).connect();

  beans.on('error', function(err){
    fatal('Beanstalkd connect error: %s', err);
  });

  yield function(done) {  // yield until beans was connected
    self.on('beans connected', done);
  };
};


/*
 * create this service a ssdb client
 */

Service.prototype.createSsdbClient = function() {
  var options = {port: configs.ssdb.port, host: configs.ssdb.host};
  this.ssdb = ssdb.createClient(options).thunkify();
  this.ssdb.on('error', function(err){ fatal('SSDB connect error: %s', err);});
  return this.ssdb;
};

exports = module.exports = Service;
