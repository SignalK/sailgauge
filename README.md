# SailGauge

One gauge to rule them all - provides all the information a sailor needs on one display
* SOG - speed over ground (knots)
* COG - course over ground
* DBT - depth below transducer (meters)
* reverse laylines, eg. 'how high can I point'
* apparent & true wind (true calculated if the data feed doesn't contain it)
* distance and direction of mark/waypoint (if feed has it)

Depth reading has also a small sparkline. Depth figure starts to grow under 6 meters and turns red under 3 meters.

## Installation

```
bower install git@github.com:SignalK/sailgauge.git
```

## Building

```
npm install gulp
gulp
```

This packages the javascript code in dist/sailgauge.js.
