# SailGauge

One gauge to rule them all - provides all the information a sailor needs on one display
* SOG - speed over ground (meters per second)
* COG - course over ground
* DBT - depth below transducer (meters)
* reverse laylines, eg. 'how high can I point'
* apparent & true wind m/s (true calculated if the data feed doesn't contain it)
* distance and direction of mark/waypoint (if feed has it)

Depth reading has also a small sparkline. Depth figure starts to grow under 6 meters and turns red under 3 meters.

## Installation

You can just download SailGauge from Github or install it with Bower

```
bower install https://github.com/SignalK/sailgauge.git
```

SailGauge package contains all the js libraries it uses so it is ready to use out of the box, but it needs data from a SignalK server.  It tries to contact SignalK server on the same server & port from which it was loaded.

If you want it to contact some other server you need to edit the index.html.

## Building

Install the js dependencies with 
```
npm install
```

and then package the js code that is not part of the html page with 

```
npm run build
```

Development time building with `npm run watch`.
