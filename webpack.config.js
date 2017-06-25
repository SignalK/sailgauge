const webpack = require("webpack");
const path = require("path");

module.exports = {
  entry: "./sailgauge.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "sailgauge.js"
  },
  module: {
    loaders: []
  },
  resolve: {
    alias: {
      bacon: "baconjs"
    }
  },
  externals: ["mdns", "validator-js", "ws"]
};
