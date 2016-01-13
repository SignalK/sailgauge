var webpack = require('webpack')

module.exports = {
  entry: {
    sailgauge: './sailgauge.js'
  },
  output: {
    path: 'dist',
    filename: '[name].js'
  },
  module: {
    loaders: [
      {test: /\.json$/, loader: 'json'}    
    ]
  },
  resolve: {
    alias: {
      bacon: "baconjs"
    }
  },
  plugins: [
  ]
}