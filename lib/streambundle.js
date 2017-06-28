var Bacon = require('baconjs');
var Qty = require('js-quantities');
var signalkSchema = require('signalk-schema');

var conversions = {
  "rad": Qty.swiftConverter('rad', 'deg'),
  "K": Qty.swiftConverter("tempK", "tempC")
}

function StreamBundle() {
  this.buses = {};
  this.streams = {};
  this.pathValues = new Bacon.Bus();
}

StreamBundle.prototype.push = function(pathValue) {
  this.pathValues.push(pathValue);
  this.getBus(pathValue.path).push(pathValue.value);
}

StreamBundle.prototype.getBus = function(path) {
  var result = this.buses[path];
  if (!result) {
    result = this.buses[path] = new Bacon.Bus();
    this.streams[path] = result.debounceImmediate(200);
  }
  return result;
}

StreamBundle.prototype.getStream = function(path) {
  var result = this.streams[path];
  const fullPath = "/vessels/*/" + path.split(".").join("/")
  if (!result) {
    this.buses[path] = new Bacon.Bus();
    result = this.streams[path] = this.buses[path].debounceImmediate(200);
    if (signalkSchema.metadata[fullPath] && conversions[signalkSchema.metadata[fullPath].units]) {
      result = this.streams[path] = this.streams[path].map(conversions[signalkSchema.metadata[fullPath].units]);
    }

  }
  return result;
}

module.exports = StreamBundle;
