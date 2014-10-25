var Bacon = require('baconjs');

function getTrueWindAngle(speed, windSpeed, windAngle) {
  var apparentX = Math.cos(Math.PI / 180 * windAngle) * windSpeed;
  var apparentY = Math.sin(Math.PI / 180 * windAngle) * windSpeed;
  return Math.atan2(apparentY, -speed + apparentX) / (Math.PI / 180);
};
module.exports.getTrueWindAngle = getTrueWindAngle;

function getTrueWindSpeed(speed, windSpeed, windAngle) {
  var apparentX = Math.cos(Math.PI / 180 * windAngle) * windSpeed;
  var apparentY = Math.sin(Math.PI / 180 * windAngle) * windSpeed;
  return Math.sqrt(Math.pow(apparentY, 2) + Math.pow(-speed + apparentX, 2));
};
module.exports.getTrueWindSpeed = getTrueWindSpeed;

module.exports.knots2MetersPerSecond = function (knots) {
  return knots * 0.514444;
};

module.exports.metersPerSecond2knots = function (mps) {
  return mps / 0.514444;
};

function toRadian(degreeAngle) {
  return Math.PI / 180 * degreeAngle;
};


module.exports.createTrueWindSpeedStream = 
  function(sogStream, apparentWindSpeedStream, apparentWindAngleStream, trueWindSpeedStream) {
    var lastTrueWindTimestamp = trueWindSpeedStream.map(function(){return Date.now();}).toProperty(0);
    var trueWindSpeedAvailable = Bacon.interval(5 * 1000, false).combine(
      lastTrueWindTimestamp,
      function(signal, lastTime) {
       return lastTime > Date.now() - 30 * 1000;
      });
    var calculated = Bacon.combineWith(
      getTrueWindSpeed,
      sogStream, apparentWindSpeedStream, apparentWindAngleStream)
      .filter(trueWindSpeedAvailable.not());
    return Bacon.mergeAll(calculated, trueWindSpeedStream);
  }

module.exports.createTrueWindAngleStream = 
  function(sogStream, apparentWindSpeedStream, apparentWindAngleStream, trueWindSpeedStream) {
    var lastTrueWindTimestamp = trueWindSpeedStream.map(function(){return Date.now();}).toProperty(0);
    var repeatingTimestamp = Bacon.fromPoll(5 * 1000, function(){return Date.now()});
    var isStale = function(timestamp, now) {return timestamp < now - 30 * 1000};
    var trueWindSpeedisStale = Bacon.combineWith(isStale, lastTrueWindTimestamp, repeatingTimestamp);
    var calculated = Bacon.combineWith(
      getTrueWindAngle,
      sogStream, apparentWindSpeedStream, apparentWindAngleStream)
      .filter(trueWindSpeedisStale);
    return Bacon.mergeAll(calculated, trueWindSpeedStream);
  }  

/*
sog = Bacon.interval(2000, 1);
windspeed = Bacon.interval(2100,3)
windAngle = Bacon.interval(2200, 90)
truewind = Bacon.interval(10 * 1000, 5)
module.exports.createTrueWindAngleStream(sog, windspeed, windAngle, truewind).log(' result')
*/