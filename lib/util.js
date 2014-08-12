var path = require('path')
  , fs = require('fs')
  , thunkify = require('thunkify')
  , Log = require('log')
  , log = new Log();   // default: debug


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
 * co utils
 */

exports.readFile = thunkify(fs.readFile);


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
