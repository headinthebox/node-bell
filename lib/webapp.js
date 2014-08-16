/* Analyzation result visualization
 */

var koa = require('koa')
  , route = require('koa-route')
  , logger = require('koa-logger')
  , mount = require('koa-mount')
  , static = require('koa-static')
  , views = require('co-views')
  , configs = require('./configs')
  , path = require('./util').path
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

function * index(pattern) {

  if (typeof pattern === 'object' && !Object.keys(pattern).length)
    pattern = '';

  var list = yield ssdb.hgetall(configs.ssdb.allSeries.hashmap);
  var keys = [], dict = {}, i = 0, key;

  while (i < list.length) {
    keys.push(key = list[i++]);
    dict[key] = list[i++];
  }

  this.body = yield render('index', {
    pattern: pattern,
    data: JSON.stringify(dict),
    apiPrefix: url('/api')
  });
}

function * api(name, start, stop) {
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
    app.use(route.get(url('/api/:name/:start/:stop'), api));
    // serve forever
    app.listen(configs.webapp.port);
  }
};
