const webpack = require("webpack");
const resolve = require("path").resolve;

module.exports = {
  entry: "./sailgauge.js",
  output: {
    path: resolve(__dirname, "dist"),
    filename: "sailgauge.js"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: {
          test: resolve(__dirname, "node_modules"),
          exclude: resolve(__dirname, "node_modules/signalk-schema") // or your module - also can be an array (read doc)
        },
        use: {
          loader: "babel-loader",
          options: {
            presets: ["env"]
          }
        }
      }
    ]
  },
  resolve: {
    alias: {
      bacon: "baconjs"
    }
  },
  externals: ["mdns", "validator-js", "ws"]
};
