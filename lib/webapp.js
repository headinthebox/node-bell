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


/*
 * url util
 */

function url (){
  var root = configs.webapp.root;
  console.log(root);
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

function * index() {
  this.body = yield render('index');
}


function * filter(pattern) {
  this.body = yield render('filter');
}


exports = module.exports = {
  serve: function *() {
    app.use(logger());
    // mount static
    app.use(mount(url('/static'), static(path.static)));
    // register routes
    app.use(route.get(url('/'), index));
    app.use(route.get(url('/:pattern'), filter));
    // serve forever
    app.listen(configs.webapp.port);
  }
};
