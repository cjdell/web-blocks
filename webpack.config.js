const LiveReloadPlugin = require('webpack-livereload-plugin');

module.exports = {
  entry: {
    "app": "./app/App.ts",
    "worker": "./worker/GeometryWorker.ts",
    "style": "./css/app.less"
  },

  output: {
    filename: "./build/[name].js"
  },

  // Enable sourcemaps for debugging webpack's output.
  devtool: "source-map",

  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: ["", ".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
  },

  module: {
    loaders: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
      { test: /\.tsx?$/, loader: "awesome-typescript-loader" },
      {
        test: /\.less$/,
        loader: "style!css!less?strictMath&noIeCompat"
      }
    ],

    preLoaders: [
      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { test: /\.js$/, loader: "source-map-loader" }
    ],

    postLoaders: [
      { loader: "transform?brfs" }
    ]
  },

  plugins: [
    new LiveReloadPlugin({ appendScriptTag: true })
  ]
};
