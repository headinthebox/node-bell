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
;

app = koa();
app.use(logger());


/*
 * urls map, {key: [route, method]}
 */

var urls = {
  index: ['/', index]
};


var root = configs.webapp.root;

// get url by key
var url = function(key, filename) {
  var res = path.join('/', root, urls[key][0]);
  if (filename === undefined) return res;
  return path.join(res, filename);
}

// get method by key
var method = function(key) { return urls[key][1];}

// register routes
Object.keys(urls).map(function(key){app.use(route.get(url(key), method(key)))});

// mount static
app.use(mount(path.join('/', root, 'static'), static(path.static)));


/*
 * render util
 */

// render util for co
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


function * index() {
  this.body = yield render('index');
}


exports = module.exports = {
  serve: function *() {
    app.listen(configs.webapp.port);
  }
};
