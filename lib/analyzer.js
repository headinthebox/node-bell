var inherits = require('util').inherits
  , format = require('util').format
  , co = require('co')
  , configs = require('./configs')
  , log = require('./util').log
  , math = require('./util').math
  , Service = require('./service')
;


/*
 * analyzer: `beans.reserve` driven
 */

function Analyzer(){}; inherits(Analyzer, Service);

Analyzer.prototype.save = function * (name, data, multi, time) {
  var score = time
    , key = format('%s:%s:%d', data, multi, time)
    , maxSize = configs.ssdb.series.zsets.maxSize
    , hash = configs.ssdb.allSeries.hashmap
    , zset = configs.ssdb.series.zsets.namePrefix + name
  ;

  var paras = [
    this.ssdb.zsize(zset),
    this.ssdb.zset(zset, key, score),
    this.ssdb.hset(hash, name, multi)
  ];
  var size = (yield paras)[0];

  if (size > maxSize)
    yield this.ssdb.zremrangebyrank(zset, 0, size - maxSize);

  return key;
}


/*
 * filter datapoints by periodicity from ssdb
 */

Analyzer.prototype.filter = function * (zset, time) {
  var offset = configs.analyzer.filterOffset
    , periodicity = configs.analyzer.periodicity
    , span = offset * periodicity
  ;

  var chunks = [];

  while (1) {
    var start = time - span, stop = time + span;
    var chunk = yield this.ssdb.zkeys(zset, '', start, stop, -1);
    if (!chunk.length) break;
    else {
      chunks.push(chunk);
      time -= periodicity;
    }
  }

  var series = [];

  for (var i = chunks.length - 1; i >= 0; i--) {
    Array.prototype.push.apply(series, chunks[i]);
  }
  return series;
}


/*
 * caculate 3-sigma multiples
 */

Analyzer.prototype.div3Sigma = function(series) {
  var strict = configs.analyzer.strict
    , minSize = configs.analyzer.minSeriesSize
  ;

  if (series.length < minSize) return 0;

  if (strict) {
    var tail = series.slice(-1)[0];
  } else {
    var tail = math.mean(series.slice(-3));
  }

  var mean = math.mean(series);
  var std = math.std(series);
  return Math.abs(tail - mean) / (3 * std);
}


/*
 * analyze current metric
 */

Analyzer.prototype.analyze = function * (metric) {
  var name = metric[0]
    , time = metric[1][0]
    , data = metric[1][1]
    , zset = configs.ssdb.series.zsets.namePrefix + name
    , series = []
  ;

  var keys = yield this.filter(zset, time);

  for (var i = 0; i < keys.length; i++) {
    var val = parseFloat(keys[i].split(':')[0]);
    series.push(val);
  }
  series.push(data);

  var multi = this.div3Sigma(series).toFixed(3);
  if (multi > 1) this.emit('anomaly detected', metric);

  var key = yield this.save(name, data, multi, time);
  log.info('Analyzed: %s', key);
}


/*
 * serve forever
 */

Analyzer.prototype.serve = function * () {
  if (!this.ssdb) this.createSsdbClient();
  if (!this.beans) this.createBeansClient();
  yield this.connectBeans('watch');

  while (1) {
    var job = yield this.beans._reserve();
    var metric = JSON.parse(job.body);
    yield this.analyze(metric);
    this.beans.destroy(job.id, function(){})
  }
}

exports = module.exports = new Analyzer;
