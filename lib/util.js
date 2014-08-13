var path = require('path')
  , fs = require('fs')
  , Log = require('log')
  , log = new Log()
;


/*
 * logging
 */

exports.logLevels = {
  1: Log.CRITICAL,
  2: Log.ERROR,
  3: Log.WARNING,
  4: Log.INFO,
  5: Log.DEBUG
}

exports.log = log;


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
};

exports.path.configs = join(exports.path.res, 'configs.toml')


/*
 * update nested dict
 */

function updateNestedObjects(obj ,other) {
  for (var key in other) {
    if (other.hasOwnProperty(key)) {
      var val = other[key];
      if (val !== null && typeof val === 'object') {  // if val is an object
        if (obj[key] === undefined)
          var tmp = obj[key] = {};
        else
          var tmp = obj[key];
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
}


/*
 * simple id manager
 */

function IDManager() {
  this.pool = {};
}

IDManager.prototype.create = function() {
  var i = 0;
  while (1) {
    if (this.pool[i] == undefined) {
      this.pool[i] = 1;
      return i;
    }
  }
}

IDManager.prototype.remove = function(id) {
  delete this.pool[id];
  return id;
}

exports.idm = new IDManager();


/*
 * math utils
 */

function _Math(){}

_Math.prototype.mean = function(series) {
  var length = series.length;
  var sum = 0;

  for (var i = 0; i < length; i++) {
    sum += series[i];
  }
  return sum / length;
}

_Math.prototype.std = function (series) {
  var mean = this.mean(series);
  var length = series.length, sum = 0;

  for (var i = 0; i < length; i++) {
    sum += Math.pow(series[i] - mean, 2);
  }
  return Math.sqrt(sum / length);
}

exports.math = new _Math();
