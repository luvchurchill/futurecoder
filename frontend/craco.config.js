const path = require('path');
const {PyodidePlugin} = require("@pyodide/webpack-plugin");

module.exports = {
  webpack: {
    plugins: {
      add: [
        new PyodidePlugin(
          process.env.REACT_APP_OFFLINE_DESKTOP
            ? {packageIndexUrl: ""}
            : {}
        ),
      ]
    },
    // Output to ./course (instead of ./build)
    configure: (webpackConfig, {env, paths}) => {
      paths.appBuild = webpackConfig.output.path = path.resolve('course');
      return webpackConfig;
    },
  },
};
