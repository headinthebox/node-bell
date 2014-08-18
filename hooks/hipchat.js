/* This module can send message to a hipchat room once enough anomalies
 * were detected. To enable it, set `hooks.enable` to `true`, and add
 * `../hooks/hipchat` to `hooks.modules`
 * ::
 *   [hooks]
 *   enable = true
 *   modules = ["../hooks/hipchat"]
 *
 * then add the following section to `configs.toml`::
 *
 *   [hooks.hipchat]
 *   roomId = 12345
 *   token = "your-hipchat-api-token"
 *   weburl = "http://bell.example.com"
 */

var util = require('util')
  , request = require('request')
;

/*
 * %0: weburl
 * %1: series
 * %2: series
 * %3: count
 * %4: seconds
 */

var pattern = (
  '<a href="%s/%s/1"><strong>%s</strong><a/>: ' +
  '<strong>%d</strong> anomalies detected in last %d seconds.'
)


exports.init = function(configs, analyzer, log) {
  var api = (
    'http://api.hipchat.com/v1/rooms/message?' +
    'format=json&auth_token=' + configs.hooks.hipchat.token
  );
  var weburl = configs.hooks.hipchat.weburl;
  var roomId = configs.hooks.hipchat.roomId;
  var recent = configs.hooks.hipchat.recent;
  var minCount = configs.hooks.hipchat.minCount;

  var dict = {};  // anomalies cache

  analyzer.on('anomaly detected', function(metric, multi){
    var key = metric[0];
    var time = metric[1][0]
    var now = (new Date).getTime() / 1000;

    if (dict[key] == undefined) dict[key] = [];

    var cache = dict[key];

    // pop outdate anomalies
    for (var i = 0; i < cache.length; i++) {
      if (now - cache[i] > recent)
        cache.splice(i, 1);
    }

     cache.push(time);

     if (cache.length >= minCount) {
       log.debug('Notify hipchat (%s, %d)..', key, cache.count);

       var message = util.format(
         pattern, weburl, key, key, cache.length, recent);

       request.post(api).form({
         room_id: roomId,
         from: 'Bell',
         message: message,
         notify: 1
       }).on('error', function(err){
         log.error('Hipchat hook request error: %s', err)
       });

       // clean cache
       while (cache.length > 0) {cache.pop()}
     }
  });
}
