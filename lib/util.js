/*
 * Utils help a lot, mmm~
 */

var path = require('path');
var fs = require('fs');
var Log = require('log');
var log = new Log();


/*
 * logging
 */

exports.logLevels = {
  1: Log.CRITICAL,
  2: Log.ERROR,
  3: Log.WARNING,
  4: Log.INFO,
  5: Log.DEBUG
};

exports.log = log;


/*
 * fatal
 */

exports.fatal = function () {
   log.error.apply(log, arguments);
   process.exit(1);
};


/*
 * pathes
 */

function join() {   // join pathes and normalize the result
  var result = path.join.apply(this, arguments);
  return path.normalize(result);
}

exports.path = {
  lib: __dirname,
  bin: join(__dirname, '..', 'bin'),
  res: join(__dirname, '..', 'res'),
  static: join(__dirname, '..', 'static'),
  view: join(__dirname, '..', 'view')
};

exports.path.configs = join(exports.path.res, 'configs.toml');
exports.path.join = join;

/*
 * update nested dict
 */

function updateNestedObjects(obj ,other) {
  var tmp;

  for (var key in other) {
    if (other.hasOwnProperty(key)) {
      var val = other[key];
      if (val !== null && typeof val === 'object') {  // if val is an object
        if (obj[key] === undefined)
          tmp = obj[key] = {};
        else
          tmp = obj[key];
        updateNestedObjects(tmp, val);
      } else {
        obj[key] = val;
      }
    }
  }
  return obj;
}
exports.updateNestedObjects = updateNestedObjects;


/*
 * copy `src` to `dest`
 */

exports.copy = function(src, dest) {
  return fs.createReadStream(src).pipe(fs.createWriteStream(dest));
};


/*
 * simple id manager
 */

function IDManager() {
  this.pool = {};
}

IDManager.prototype.create = function() {
  var i = 0;
  while (1) {
    if (this.pool[i] === undefined) {
      this.pool[i] = 1;
      return i;
    }
  }
};

IDManager.prototype.remove = function(id) {
  delete this.pool[id];
  return id;
};

exports.idm = new IDManager();


/*
 * math utils
 */

function _Math(){}

// average
_Math.prototype.mean = function(series) {
  var length = series.length;
  var sum = 0;

  for (var i = 0; i < length; i++) {
    sum += series[i];
  }
  return sum / length;
};

// standard deviation
_Math.prototype.std = function (series) {
  var mean = this.mean(series);
  var length = series.length, sum = 0;

  for (var i = 0; i < length; i++) {
    sum += Math.pow(series[i] - mean, 2);
  }
  return Math.sqrt(sum / length);
};

// weighted moving average
// series min length: 1
// alpha: 0~1 (weight factor)
_Math.prototype.wma = function(series, alpha) {
  // alaph bigger => timeliness better
  if (!alpha) alpha = 0.5;

  var mean = series[0];

  for (var i = 1; i < series.length; i++) {
    mean = mean * (1 - alpha) + alpha * series[i];
  }

  return mean;
};

exports.math = new _Math();


/*
 * patch utils
 */

var patchBeansClient = function(beans) {
  // fivebeans is very ugly, here patches some methods of it;

  // thunkify reserve
  var reserve = function(cb) {beans.reserve(cb);};
  beans._reserve = function() {
    return function(cb) {
      var _cb = function(e, jid, buf){
        cb(e, {id: jid, body: buf.toString()});
      };
      reserve.apply(this, [_cb]);
    };
  };
};

exports.patches = {
  patchBeansClient: patchBeansClient
};


/*
 * others
 */
exports.isEmptyObject = function(obj) {
  return typeof obj === 'object' && !Object.keys(obj).length;
};
