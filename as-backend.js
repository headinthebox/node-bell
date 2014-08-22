/*
 * this module exports function `init` as a statsd's backend
 *
 * Optional configs:
 *
 *   bellHost, string, default: '0.0.0.0'
 *   bellPort, integer, default: 2024
 *   bellIgnores, array, default: ['statsd.*']
 *   bellTimerDataFields, array, default: ['mean', 'count_ps']
 *
 *
 * Metric types supported: `counter` & `timer` (counter_rates & timer_data)
 */


var net = require('net');
var minimatch = require('minimatch');

var debug;
var logger;
var config;


// metrics makers
var makers = {
  counter_rates: function (key, val, time) {
    return [['counter.' + key, [time, val]]];
  },
  timer_data: function (key, stats, time) {
    var fields = config.bellTimerDataFields || ['mean', 'count_ps'];
    var metrics = [];
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      var name = ['timer', field, key].join('.');
      var val = stats[field];
      metrics.push([name, [time, val]]);
    }
    return metrics;
  }
};


function match (key) {
  var ignores = config.ignores || ['statsd.*'];
  for (var i = 0; i < ignores.length; i++) {
    if (minimatch(key, ignores[i]))
      return true;
  }
  return false;
}


function Bell() {
  this.conn = net.connect({
    host: config.bellHost || '0.0.0.0',
    port: config.bellPort || 2024
  }, function(){
    if (debug)
      logger.log('bell connected successfully');
  });

  this.conn.addListener('error', function(err){
    if (debug)
      logger.log('bell connection error: ' + err.message);
  });
}


Bell.prototype.flush = function(time, data) {
  var list = [];
  var types = Object.keys(makers);

  for (var i = 0; i < types.length; i++) {
    var type = types[i];
    var dict = data[type];

    for (var key in dict) {
      if (!match(key)) {
        var val = dict[key];
        var maker = makers[type];
        var metrics = maker(key, val, time);
        Array.prototype.push.apply(list, metrics);
      }
    }
  }

  var length = list.length;

  if (length > 0) { // send metrics only if isnt empty
    var string = JSON.stringify(list);
    var buffer = new Buffer('' + string.length + '\n' + string);
    this.conn.write(buffer, 'utf8', function(){
      if (debug) {
      var message = 'sent to bell: ' + JSON.stringify(list[0]);
      if (length > 1) message += ', (' + (length - 1) + ' more..)';
      logger.log(message);
      }
    });
  }
};


exports.init = function(uptime, _config, events, _logger) {
  logger = _logger || console;
  debug = _config.debug;
  config = _config || {};
  var bell = new Bell();
  events.on('flush', function(time, data){bell.flush(time, data);});
  return true;
};
