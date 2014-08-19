/*
 * this module exports function `init` as a statsd's backend
 *
 * Optional configs:
 *
 *   bellHost, string, default: '0.0.0.0'
 *   bellPort, integer, default: 2024
 *   bellIgnores, array, default: ['statsd.*']
 *   bellTimerDataTypes, array, default: ['mean', 'count_ps']
 *
 *
 * Metric types supported: `counter` & `timer`.
 */


var net = require('net')
  , minimatch = require('minimatch')
;

var logger, debug;


var makers = {
  counter_rate: function(key, val, time) {
    return [['counter.' + key, [time, val]]];
  },

  timer_data: function(key, stats, time) {
    //PASS
  }
}
