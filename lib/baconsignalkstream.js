var Bacon = require('baconjs');
debug = require('debug');

function StreamBundle(extractTypeFunction) {
  this.extractTypeFunction = extractTypeFunction;
};

StreamBundle.prototype = {
  getTypeStream: function (type) {
    if (this[type] === undefined) {
      this[type] = new Bacon.Bus();
    }
    return this[type];
  },
  getTypeValueStream: function (type) {
    return this.getTypeStream(type).map('.value');
  },
  push: function (msg) {
    this.getTypeStream(this.extractTypeFunction(msg)).push(msg);
    debug('signalk:' + this.extractTypeFunction(msg))(msg.value);
  },
}

module.exports = StreamBundle;
