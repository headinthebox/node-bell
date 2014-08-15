/* Analyzation result visualization
 */

var koa = require('koa')
  , route = require('koa-route')
  , configs = require('./configs')
  , logger = require('koa-logger')
;

app = koa();

// middleware
app.use(logger());

// routes
app.use(route.get('/', index));


function * index() {
  this.body = "hello world";
}

exports = module.exports = {
  serve: function *() {
    app.listen(configs.webapp.port);
  }
};
