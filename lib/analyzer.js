var inherits = require('util').inherits
  , format = require('util').format
  , co = require('co')
  , configs = require('./configs')
  , log = require('./util').log
  , math = require('./util').math
  , Service = require('./service')
;

// analyzer, beans.reserve driven
function Analyzer(){
  var self = this;
  this.on('datapoint reserved', co(self.analyze));
  this.on('analyzation done', function(jid){self.deleteJob(jid)});
  this.on('analyzation done', function(jid){self.reserveJob()});
}
inherits(Analyzer, Service)

Analyzer.prototype.zsetName = function(seriesName){
  return configs.ssdb.series.zsets.namePrefix + seriesName;
}

Analyzer.prototype.reserveJob = function() {
  var self = this;
  this.beans.reserve(function(err, jid, buf){
    if (err) {
      log.warning('Error on resering job from beanstalkd: %s', err);
    }
    metric = JSON.parse(buf.toString());
    log.debug('Job reserved, job id: %d, body: %s', jid, metric);
    self.emit('datapoint reserved', metric, jid);
  });
}

Analyzer.prototype.deleteJob = function(jid) {
  this.beans.destroy(jid, function(err){
    if (err) log.warning('Failed to delete job %d, %s', jid, err);
  });
  log.debug('Job deleted, id: %d', jid);
}

Analyzer.prototype.filterDatapoints = function *(zset, time) {
  // filter datapoints by periodicity from ssdb
  var offset = configs.analyzer.filterOffset
    , periodicity = configs.analyzer.periodicity
    , timeCursor = time
    , timeSpan = offset * periodicity;

  var series = [];

  while (1) {
    var start = timeCursor - timeSpan
      , stop = timeCursor + timeSpan
    ;
    var chunk = yield this.ssdb.zkeys(zset, '', start, stop, -1);
    if (!chunk.length) break;
    else {
      Array.prototype.push.apply(series, chunk);
      timeCursor -= periodicity;
    }
  }
  return series;
}

Analyzer.prototype.saveDatapoint = function *(zset, data, multi, time) {
  var score = time
    , key = format('%s:%s:%d', data, multi, time)
    , maxSize = configs.ssdb.series.zsets.maxSize;

  yield this.ssdb.zset(zset, key, score);
  return key;
}

Analyzer.prototype.div3Sigma = function (series) {
    var strict = configs.analyzer.strict
      , minSize = configs.analyzer.minSeriesSize
    ;

    if (series.length < minSize) return 0;

    if (strict) {
      var tail = series.slice(-1)[0];
    }
    else{
      var tail = math.mean(series.slice(-3));
    }
    // 3-Sigma
    var mean = math.mean(series);
    var std = math.std(series);
    return Math.abs(tail - mean) / (3 * std);
}

Analyzer.prototype.analyze = function * (metric, jid) {
  var name = metric[0]
    , time = metric[1][0]
    , data = metric[1][1]
    , zset = this.zsetName(name)
    , self = this
    , keys = yield this.filterDatapoints(zset, time)
    , series = []
  ;

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var val = parseFloat(key.split(':')[0]);
    series.push(val);
  }

  series.push(data);

  var multi = this.div3Sigma(series).toFixed(3);

  if (multi > 1) this.emit('anomaly detected', metric);

  var key = yield this.saveDatapoint(zset, data, multi, time);

  log.info('Analyzed: %s, job id: %d', key, jid);

 this.emit('analyzation done', jid);
}


Analyzer.prototype.serve = function *() {
  if (!this.ssdb) this.createSsdbClient();
  if (!this.beans) this.createBeansClient();
  yield this.connectBeans('watch');
  return this.reserveJob();
}

exports = module.exports = new Analyzer();
