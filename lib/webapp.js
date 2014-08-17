/* Analyzation result visualization
 */

var koa = require('koa')
  , route = require('koa-route')
  , logger = require('koa-logger')
  , mount = require('koa-mount')
  , static = require('koa-static')
  , views = require('co-views')
  , minimatch = require('minimatch')
  , configs = require('./configs')
  , path = require('./util').path
  , isEmptyObject = require('./util').isEmptyObject
  , service = new (require('./service'))
;

app = koa();

var ssdb;


/*
 * url util
 */

function url (){
  var root = configs.webapp.root;
  [].splice.call(arguments, 0, 0, '/', root)
  return path.join.apply(this, arguments)
}


/*
 * render utils for co
 */
var render = (function(){
  var render = views(path.view, {map: {html: 'swig'}});
  // 'global' vars for swig
  var globals = {url: url};

  return function * (view, locals) {
    locals = locals || {};
    for (key in globals) {
      if (globals.hasOwnProperty(key)) locals[key] = globals[key];
    }
    return yield render(view, locals);
  }
})();


/*
 * route methods
 */

function * index(pattern, limit) {

  if (isEmptyObject(pattern) || pattern === undefined) pattern = '*';
  if (isEmptyObject(limit) || limit === undefined) limit = '50';

  limit = +limit;  // cast to int

  this.body = yield render('index', {
    pattern: pattern,
    limit: limit,
    apiPrefix: url('/api')
  });
}


/*
 * api to fetch series names
 */

function * apiNames (pattern, limit) {
  limit = +limit;  // cast to int

  var list = yield ssdb.hgetall(configs.ssdb.allSeries.hashmap);
  var keys = [], dict = {}, i = 0, key;

  while (i < list.length) {
    keys.push(key = list[i++]);  // collect keys
    dict[key] = +list[i++];  // collect float vals
  }

  // filter by pattern
  keys = keys.filter(minimatch.filter(pattern));

  // sort by current anomaly
  keys = keys.sort(function(x, y){return dict[y] - dict[x]});

  this.body = keys.slice(0, limit);
}

/*
 * api to fetch metrics
 */

function * apiMetrics(name, start, stop) {
  var zset = configs.ssdb.series.zsets.namePrefix + name;
  var list = yield ssdb.zkeys(zset, '', +start, +stop, -1);
  var times = [], vals = [];

  for (var i = 0; i < list.length; i++) {
    var e = list[i].split(':');
    vals.push(+e[1]); times.push(+e[2]);
  }

  this.body = yield {times: times, vals: vals};
}


exports = module.exports = {
  serve: function *() {
    ssdb = service.createSsdbClient();
    app.use(logger());
    // mount static
    app.use(mount(url('/static'), static(path.static)));
    // register routes
    app.use(route.get(url('/'), index));
    app.use(route.get(url('/:pattern'), index));
    app.use(route.get(url('/:pattern/:limit'), index));
    app.use(route.get(url('/api/names/:pattern/:limit'), apiNames));
    app.use(route.get(url('/api/metrics/:name/:start/:stop'), apiMetrics));
    // serve forever
    app.listen(configs.webapp.port);
  }
};
