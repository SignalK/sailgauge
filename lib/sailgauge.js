var Bacon = require('baconjs');
var StreamBundle = require('./baconsignalkstream.js');
var navi = require('./naviutils.js');
var signalKUtils = require('./signalkutils.js');

function SailGauge(treeData) {
  this.visible = true;
  this.dispatchers =  {};
}

SailGauge.prototype = {
  init: function (selector, size) {
    this.drawSvg(selector, size);
    this.startPeriodicTask();
    this.streamBundle = new StreamBundle(function(msg) {
      return msg.path;
    });
    this.initStreams();
    return this.dispatch.bind(this);
  },
  initStreams: function () {
    this.on('navigation.courseOverGroundTrue', this.updateCourse.bind(this));
    this.on('navigation.speedOverGround', this.updateSpeedOverGround.bind(this));

    var sanitizedDepthStream = this.getTypeValueStream('environment.depth.belowTransducer')
      .filter(function(depth){return depth < 200;});
    sanitizedDepthStream.onValue(this.updateDepthDisplay.bind(this));
    var doDrawSparkLine = this.drawSparkline.bind(this);
    sanitizedDepthStream.slidingTimeWindow(60 * 1000).onValue(function (data) {
      doDrawSparkLine("#depthSpark", data, 100, 50);
    });

    this.on('environment.wind.speedApparent', this.updateApparentWindSpeed.bind(this));
    this.on('environment.wind.angleApparent', this.updateApparentWindAngle.bind(this));

    navi.createTrueWindSpeedStream(
      this.getTypeValueStream('navigation.speedOverGround'),
      this.getTypeValueStream('environment.wind.speedApparent'),
      this.getTypeValueStream('environment.wind.angleApparent'),
      this.getTypeValueStream('environment.wind.speedTrue')
    ).onValue(this.updateTrueWindSpeed.bind(this));

    var trueWindAngleStream = navi.createTrueWindAngleStream(
      this.getTypeValueStream('navigation.speedOverGround'),
      this.getTypeValueStream('environment.wind.speedApparent'),
      this.getTypeValueStream('environment.wind.angleApparent'),
      this.getTypeValueStream('environment.wind.speedTrue')
    );
    trueWindAngleStream.onValue(this.updateTrueWindAngle.bind(this));
    var groundWindAngleStream = trueWindAngleStream.combine(
      this.streamBundle.getTypeValueStream('navigation.courseOverGroundTrue'),
      function (trueWind, course) { return trueWind + course;}
    );

    var that = this;
    groundWindAngleStream.slidingTimeWindow(30 * 1000).throttle(1000).onValue(function (data) {
      if (data.length < 5) return;
      var copyData = data.slice(0).sort(function(a,b){return a.value - b.value;});
      var twa_max = copyData[copyData.length -1].value;
      var twa_min = copyData[0].value;
      d3.select("#portwindsector").attr("d", that.arcForAngle(twa_max - twa_min));
      d3.select("#gportwindsector").attr("transform", "rotate(" + (twa_min - 30 ) + " 400 400)");
      d3.select("#starboardwindsector").attr("d", that.arcForAngle(twa_max - twa_min));
      d3.select("#gstarboardwindsector").attr("transform", "rotate(" + (twa_min + 30 ) + " 400 400)");
    });
  },
  dispatch: function(signalK) {
    if (typeof signalK.path != 'undefined') {
      this.streamBundle.push(signalK);
    } else {
      signalKUtils.dispatchInTree(signalK, this.dispatchers);
    }
  },
  on: function(item, callback) {
    this.getTypeValueStream(item).onValue(callback);    
  },
  getTypeValueStream: function(item) {
    this.registerToStreamDispatcher(this.dispatchers, item.split('.'), this.streamBundle.getTypeStream(item));
    return this.streamBundle.getTypeValueStream(item);
  },
  registerToStreamDispatcher: function(dispatcherBranch, itemKeysArray, stream) {
    if (itemKeysArray.length === 1) {
      dispatcherBranch[itemKeysArray[0]] = stream.push;
    } else {
      if (typeof dispatcherBranch[itemKeysArray[0]] === 'undefined') {
        dispatcherBranch[itemKeysArray[0]] = {};
      }
      this.registerToStreamDispatcher(dispatcherBranch[itemKeysArray[0]], itemKeysArray.slice(1), stream);
    }
  },
  updateSpeedOverGround: function(speed) {
    if (speed != null) {
      d3.select('#speed').text(speed.toFixed(1));
    }
  },
  updateApparentWindAngle: function (angle) {
    this.rotateAnimated('#apparentwindmarker', angle, 400, 400, 20);
    d3.select("#apparentwindmarkertext")
      .attr("transform", "rotate(" + (-1 * angle) + " 400 60)");
  },
  updateApparentWindSpeed: function (speed) {
    d3.select("#apparentwindmarkertext")
      .text(Number(speed).toFixed(1));
  },
  updateTrueWindAngle: function (angle) {
    this.rotateAnimated('#windmarker', angle, 400, 400, 20);
    d3.select("#windmarkertext")
      .attr("transform", "rotate(" + (-1 * angle) + " 400 140)")
  },
  updateTrueWindSpeed: function (speed) {
    d3.select("#windmarkertext")
      .text(Number(speed).toFixed(1));
  },
  updateMark: function (msg) {
    d3.select('#markdistance').text(Number(msg.distance).toFixed(1));
    this.bearingToMark = msg.bearing;
    d3.select("#mark").attr("display", "inline");
    d3.select('#marktext').attr("transform", "rotate(" + (-1 * this.bearingToMark + this.trackTrue) + " 400 118)");
    d3.select('#markdistance').attr("transform", "rotate(" + (-1 * this.bearingToMark + this.trackTrue) + " 400 70)");
    d3.select('#marktext').text(msg.bearing.toFixed(0));
    this.rotateAnimated('#mark', this.bearingToMark, 400, 400, 200);
    this.lastAutopilotReceiveTime = Date.now();
  },
  trackTrue: 0,
  bearingToMark: 45,
  updateCourse: function (value) {
    this.trackTrue = value;
    d3.select('#tracktruetext').text(this.trackTrue.toFixed(0) + '°');
    this.rotateAnimated('#rose', -1 * this.trackTrue, 400, 400, 200);
    d3.select('#marktext').attr("transform", "rotate(" + (-1 * this.bearingToMark + this.trackTrue) + " 400 118)");
    d3.select('#markdistance').attr("transform", "rotate(" + (-1 * this.bearingToMark + this.trackTrue) + " 400 70)");
  },
  lastDepthReceiveTime: 0,
  lastAutopilotReceiveTime: 0,
  updateDepthDisplay: function (depth) {
    var depthText = d3.select('#depth');
    depthText.text(depth.toFixed(1) + 'm').attr("display", "inline");
    var fontSize = this.depthFontSize(depth);
    depthText.attr('font-size', fontSize);
    depthText.attr('dy', (fontSize * 0.7 ) - 60);
    depthText.attr('fill', depth < 6 ? 'red' : null);
    depthText.attr('font-weight', depth < 6 ? 'bold' : null);
    this.lastDepthReceiveTime = Date.now();
  },  
  startPeriodicTask: function () {
    var that = this;
    setInterval(function hideInactiveElements() {
      if (Date.now() - that.lastAutopilotReceiveTime > 60 * 1000) {
        d3.select("#mark").attr("display", "none");
      }
      if (Date.now() - that.lastDepthReceiveTime > 5 * 1000) {
        d3.select("#depth").attr("display", "none");
      }
    }, 5000);
  },
  setVisible: function(flag) {
    this.visible = flag;
  },
  drawWindMarkers: function (chart) {
    var windmarker = chart.append("g")
      .attr("id", "windmarker")
      .attr("class", "truewind");
    windmarker.append("path").attr("d", "M 400,100 L  385,130  a 20,20 0 1,0 30,0 z");
    windmarker.append("path").attr("d", "M 390,400 l 10,-300 10,300 z")
      .attr("style", "fill:#00FF00;stroke:#00FF00;stroke-width:1")
      .attr("transform", "rotate(30 400 400)");
    windmarker.append("path").attr("d", "M 390,400 l 10,-300 10,300 z")
      .attr("style", "fill:#ff0000;stroke:#ff0000;stroke-width:1")
      .attr("transform", "rotate(-30 400 400)");
    windmarker.append("text").attr("id", "windmarkertext").attr("x", "400").attr("y", "140")
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .attr("class", "text").text("0");

    var apparentwindmarker = chart.append("g")
      .attr("id", "apparentwindmarker").attr("class", "apparentwind");
    apparentwindmarker.append("path").attr("d", "M 400,100 L  385,70  a 20,20 0 1,1 30,0 z");
    apparentwindmarker.append("text").attr("id", "apparentwindmarkertext").attr("x", "400").attr("y", "60")
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .attr("class", "text").text("0");
  }, 
  drawTrackLabel: function (chart) {
    chart.append('rect')
      .attr('x', '370').attr('y', '60')
      .attr('rx', '5').attr('ry', '5')
      .attr('width', '60').attr('height', '40')
      .attr('class', 'rose');
    chart.append('text')
      .attr('id', 'tracktruetext')
      .attr('x', '400').attr('y', '80')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', '25').text('000');
  },
  drawCompassRose: function (chart, size) {
    var rose = chart.append('g').attr('id', 'rose').attr('class', 'rose');
    rose.append('g').attr('id', 'edge').attr('class', 'p1');
    rose.append('circle').attr('cx', size / 2).attr('cy', size / 2).attr('r', size / 2 - 80).attr('fill', 'gray').attr('stroke-width', '2px');
    rose.append('path')
      .attr('d', "M 700 400 A 300 300 0 1 1  100,400 A 300 300 0 1 1  700 400 z")
      .attr('class', 'p-1')
      .attr('fill', 'url(#rosegradient)')
      .attr('opacity', '0.8')
      .attr('stroke-width', '2px');
    rose.append('g').attr('id', 'tickmarks');
    rose.append('g').attr('id', 'tickmarksTop');
    return rose;
  },
  drawMark: function (rose) {
    var mark = rose.append('g').attr('id', 'mark');
    mark.append('path').attr('d', "M 385,60 L 415,60 400,90 z").attr('class', 'mark');
    mark.append('circle').attr('cx', '400').attr('cy', '70').attr('r', '14').attr('stroke', 'none').attr('fill', 'white');
    mark.append('text')
      .attr('id','markdistance')
      .attr('x', '400').attr('y', '70')
      .attr('class', 'marktext')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').text('000');
    mark.append('circle').attr('cx', '400').attr('cy', '118').attr('r', '14').attr('stroke', 'none').attr('fill', 'white');
    mark.append('text')
      .attr('id','marktext')
      .attr('x', '400').attr('y', '118').attr('class', 'marktext')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').text('0.0');
  },
  drawBackground: function (chart, selector, size) {
    chart = d3.select(selector)
      .append('svg:svg')
      .attr('viewBox', "0 0 " + size + " " + size)
      .attr('preserveAspectRatio', "xMidYMid meet")
      .attr('class', 'chart');
    var defs = chart.append('defs');
    var gradient = defs.append('linearGradient')
      .attr('id', 'rosegradient')
      .attr('x1', '0')
      .attr('x2', '0')
      .attr('y1', '0')
      .attr('y2', '1')
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#0c5da5');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#ff4f00');
    return chart;
  },
  drawDepthIndicator: function (chart) {
    chart.append('text')
      .attr('x', '800').attr('y', '60')
      .attr('text-anchor', 'end').attr('dominant-baseline', 'text-after-edge')
      .attr('class', 'positivegaugetext')
      .append('tspan')
      .attr('id', 'depth').attr('dy', '0px').attr('font-size', '60').text('99.9');
    chart.append("g").attr("transform","translate(700 80)")
      .append("path").attr("id","depthSpark").attr("class","sparkline").attr("d","M 5,5 l 10,10 -10,0 z");
  },
  drawSpeedLabel: function (chart) {
    chart.append("text")
      .attr("id", "speed").attr("x", "400").attr("y", "400")
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .attr("font-size", "60").text("-");
  },
  drawWindSectors: function (chart) {
    chart.append("g").attr("id","gportwindsector").attr("transform","rotate(0 400 400)")
      .append("path")
        .attr("id","portwindsector").attr("d","M400,400 v-300 a300,300 1 0,1 0,0 z")
        .attr("fill","#ffdddd").attr("stroke","none");
    chart.append("g").attr("id","gstarboardwindsector").attr("transform","rotate(0 400 400)")
      .append("path")
        .attr("id","starboardwindsector").attr("d","M400,400 v-300 a300,300 1 0,1 0,0 z")
        .attr("fill","#ddffdd").attr("stroke","none");
  },
  drawSvg: function (selector, size) {
    var chart = this.drawBackground(chart, selector, size);
    var rose = this.drawCompassRose(chart, size);
    this.drawTicks();
    this.drawTrackLabel(chart);
    this.drawWindSectors(rose);
    this.drawMark(rose);
    this.drawWindMarkers(chart);
    this.drawBoat(chart);
    this.drawSpeedLabel(chart);
    this.drawDepthIndicator(chart);
  },
  drawTicks: function () {
    var tickmarks = d3.select("#tickmarks");
    var tickmarksTop = d3.select("#tickmarksTop");
    for (var i = 10; i < 360; i += 10) {
      tickmarks.append("path").attr("id", "id10-" + i)
        .attr("d", "m 400,80 L 400,100")
        .attr("stroke-width", "1")
        .attr("transform", "rotate(" + i + " 400 400)");
    }
    for (var i = 5; i < 360; i += 5) {
      tickmarks.append("path").attr("id", "id5-" + i)
        .attr("d", "m 400,90 L 400,100")
        .attr("stroke-width", "1")
        .attr("transform", "rotate(" + i + " 400 400)");
    }
    var dirs = ['N', 'E', 'S', 'W' ];
    for (var i = 0; i < 360; i += 90) {
      tickmarksTop.append("rect").attr("id", "box" + i)
        .attr("x", "380")
        .attr("y", "100")
        .attr("width", "40")
        .attr("height", "30")
        .attr("transform", "rotate(" + i + " 400 400)")
        .text(i);
      tickmarksTop.append("text").attr("id", "bearing" + i)
        .attr("x", "400")
        .attr("y", "120")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(" + i + " 400 400)")
        .attr("class", "text")
        .text(dirs[0]);
      dirs = dirs.splice(1);
    }
    var dirs = ['NE', 'SE', 'SW', 'NW'];
    for (var i = 45; i < 360; i += 90) {
      tickmarks.append("rect").attr("id", "box" + i)
        .attr("x", "385")
        .attr("y", "100")
        .attr("width", "30")
        .attr("height", "20")
        .attr("transform", "rotate(" + i + " 400 400)")
        .text(i);
      tickmarks.append("text").attr("id", "bearing" + i)
        .attr("x", "400")
        .attr("y", "115")
        .attr("font-size", "80%")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(" + i + " 400 400)")
        .attr("class", "text")
        .text(dirs[0]);
      dirs = dirs.splice(1);
    }
  },
  drawSparkline: function (selector, data, width, height) {
    if (data.length > 0) {
      var now = Date.now();
      var x = d3.scale.linear().domain([
        d3.min(data, function (d) { return d.timestamp - now;}),
        d3.max(data, function (d) {return d.timestamp - now;})])
        .range([0, width]);
      var y = d3.scale.linear().domain([
        d3.min(data, function (d) {return d.value}),
        d3.max(data, function (d) {return d.value})])
        .range([0, height]);
      var line = d3.svg.line()
        .x(function (d) {return x(d.timestamp - now);})
        .y(function (d) {return y(d.value);});
      d3.select(selector).attr("d", line(data));
    }
  },
  drawBoat: function (chart) {
    var boat = chart.append('g').attr('id', 'boat').attr('transform', 'rotate(90 100 100) translate(150 -450) scale(2.5)')
    boat.append('path')
      .attr('style', 'stroke:#00ff00;stroke-width:2px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1')
      .attr('d', 'm 0,100 c 150,-100 200,-35 200,-35 0,35 0,35 0,35')
      .attr('class', 'boat sp');
    boat.append('path')
      .attr('style', 'stroke:#dd0000;stroke-width:2px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1')
      .attr('d', 'm 200,100 c 0,35 0,35 0,35  0,0 -70,65 -200,-35')
      .attr('class', 'boat');
  },
  depthFontSize: function (depth) {
    var minFontSize = 60;
    var maxFontSize = 300;
    var shallowThreshold = 6;
    var minThreshold = 3;
    if (depth > shallowThreshold) {
      return minFontSize
    }
    if (depth < minThreshold) {
      return maxFontSize;
    }
    return minFontSize + (shallowThreshold - depth) / (shallowThreshold - minThreshold) * (maxFontSize - minFontSize);
  },
  arcForAngle: function (angle) {
    return 'M400,400 v-300 a300,300 1 0,1 ' +
      Math.sin(angle * Math.PI / 180) * 300 + ',' +
      (1 - Math.cos(angle * Math.PI / 180)) * 300 + ' z';
  },
  rotateAnimated: function (selector, angleTo, x, y, millis) {
    var d3g = d3.select(selector);
    var previousTransform = d3g.attr('transform');
    var tween = function (d, i, a) {
      return d3.interpolateString(previousTransform, 'rotate(' + angleTo + " " + x + " " + y + ")");
    }
    d3g.transition().duration(this.visible ? millis : 0).attrTween('transform', tween);
  }  
}

module.exports = SailGauge;