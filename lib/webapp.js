/* Analyzation result visualization
 */

var koa = require('koa')
  , route = require('koa-route')
  , logger = require('koa-logger')
  , views = require('co-views')
  , configs = require('./configs')
  , path = require('./util').path
;

app = koa();


/*
 * middleware
 */

app.use(logger());  // logger


/*
 * urls map, {key: [route, function]}
 */

var urls = {
  index: ['/', index]
};

var root = configs.webapp.root;

Object.keys(urls).map(function(key){
  var url = urls[key][0] = path.join('/', root, urls[key][0]);
  var method = urls[key][1];
  app.use(route.get(url, method));  // register route
});


/*
 * render util
 */

// render util for co
var render = (function(){
  var render = views(path.view, {map: {html: 'swig'}});
  // 'global' vars for swig
  var globals = {
    root: root,
    url: function(key, filename) {
      var url = urls[key][0];
      return filename ? path.join(url, filename) : url;
    }
  };

  return function * (view, locals) {
    locals = locals || {};
    for (key in globals) {
      if (globals.hasOwnProperty(key))
        locals[key] = globals[key];
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
