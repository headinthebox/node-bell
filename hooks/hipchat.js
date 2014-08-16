/* This module can send message to a hipchat room once an anomalous datapoint
 * was detected. To enable it, set `hooks.enable` to `true`, and add
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
 * message template:
 *   %1: metric name
 *   %2: web url
 *   %3: metric name
 *   %4: datetime
 *   %5: value
 *   %6: multi
 */
var pattern = ('Anomaly detected: %s, time: <a href="%s/%s/1">' +
              '%s</a>, value: %s, abnormal factor: %s')


/*
 * util to convert timestamp to readable date string
 */
function timestamp2str(timestamp) {
  var date = new Date(timestamp * 1000);
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var seconds = date.getSeconds();
  return hours + ':' + minutes + ':' + seconds;
}

exports.init = function(configs, analyzer, log) {
  var api = 'http://api.hipchat.com/v1/rooms/message?' +
    'format=json&auth_token=' + configs.hooks.hipchat.token;
  var web = configs.hooks.hipchat.weburl;
  var roomId = configs.hooks.hipchat.roomId;

  analyzer.on('anomaly detected', function(metric, multi){
    var name = metric[0];
    var datetime = timestamp2str(metric[1][0]);
    var value = metric[1][1];
    var message = util.format(
      pattern,
      name, web, name, datetime, value, multi);
    request.post(api).form({
      room_id: roomId, from: 'Bell', message: message
    });
  });
};
