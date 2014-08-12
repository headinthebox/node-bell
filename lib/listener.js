var configs = require('./configs')
;

function Listener() {
  this.configs = configs;
}


Listener.prototype.serve = function() {
}


exports = module.exports = new Listener();
