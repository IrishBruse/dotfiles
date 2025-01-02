const fs = require("fs");

if (fs.existsSync("node_modules/@gp-nova/react-scripts/PATCHED")) {
  return;
}

const StartScript = "node_modules/@gp-nova/react-scripts/scripts/start.js";
const webpackDevServerScript =
  "node_modules/@gp-nova/react-scripts/config/webpackDevServer.config.js";

let text = fs.readFileSync(StartScript).toString();

const patchClearConsole = `"use strict";

// Intercept the console clear call
const modulePath = require.resolve("react-dev-utils/clearConsole");
require(modulePath);
require.cache[modulePath].exports = function (...args) {};`;

text = text.replace('"use strict";', patchClearConsole);

text = text.replace(
  `const openBrowser = require("react-dev-utils\/openBrowser");`,
  `const openBrowser = (arg)=>{};`
);

// console.log(text);

fs.writeFileSync(StartScript, text);

console.log("PATCHED " + StartScript);

// webpackDevServerScript

text = fs.readFileSync(webpackDevServerScript).toString();

const deprecationPatch = `
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      if (fs.existsSync(paths.proxySetup)) {
        require(paths.proxySetup)(devServer.app);
      }

      middlewares.push(
        evalSourceMapMiddleware(devServer),
        redirectServedPath(paths.publicUrlOrPath),
        noopServiceWorkerMiddleware(paths.publicUrlOrPath)
      );

      return middlewares;`;

text = text.replace(
  /onBeforeSetupMiddleware.*noopServiceWorkerMiddleware\(paths\.publicUrlOrPath\)\);/s,
  deprecationPatch
);

// console.log(text);

fs.writeFileSync(webpackDevServerScript, text);

console.log("PATCHED " + webpackDevServerScript);

// Misc

fs.writeFileSync(
  "node_modules/@gp-nova/react-scripts/scripts/utils/printBanner.js",
  ""
);

fs.writeFileSync("node_modules/@gp-nova/react-scripts/PATCHED", "");
