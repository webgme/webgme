/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

if (typeof define !== "function" && typeof require === "function" && typeof process === "object") {
  var FS = require("fs");
  var path = require("path");

  var name = __dirname;
  if (name.charAt(name.length - 1) !== '/') {
    name += '/';
  }
  name += "config.js";
  var dispName = path.relative(process.cwd(), name);

  FS.stat(name, function (err, stat) {
    if (err && err.errno === 34) {
      var file = "// local configuration, please edit it by hand\n\ndefine([], function () {\n\t\"use strict\";\n\n\treturn {};\n});\n";
      FS.writeFile(name, file, function (err) {
        if (err) {
          console.log("Error writing " + dispName);
          console.log(err);
        } else {
          console.log("Created " + dispName + " file, please edit it by hand");
        }
      });
    } else if (stat.isFile()) {
      console.log(dispName + " already exists, please modify or delete it by hand");
    } else {
      console.log("Unknown problem, please delete " + dispName + " and run again");
      console.log(err || stat);
    }
  });
} else {
  define("ifexists", {
    load: function (name, require, onload) {
      require([name], onload, function (err) {
          if (!err.originalError || err.originalError.code !== 'MODULE_NOT_FOUND') {
              console.error('Error loading ' + name + ': ' + err.message);
          }
          onload(null);
      });
    }
  });

  define(["ifexists!bin/config"], function (LOCAL) {
    "use strict";

    var GLOBAL = {
      port: 80,
      autorecconnect: true,
      reconndelay: 1000,
      reconnamount: 1000,

      //used by the server
      loglevel: 1, // 5 = ALL, 4 = DEBUG, 3 = INFO, 2 = WARNING, 1 = ERROR, 0 = OFF
      logfile: 'server.log',
      mongoip: "127.0.0.1",
      mongoport: 27017,
      mongodatabase: "multi",
      //mongouser: TODO by default we do not expect mongodb to use authentication
      //mongopwd: TODO by default we do not expect mongodb to use authentication
      authentication: false,
      secureREST: false,
      httpsecure: false,
      guest: false,
      sessioncookieid: 'webgmeSid',
      sessioncookiesecret: 'meWebGMEez',
      debug: false,
      paths: {},
      pluginBasePaths: [],
      decoratorpaths: [],
      visualizerDescriptors: [],
      addonBasePaths: ['./addon/core'],
      storageKeyType: "asmSHA1" // right now the available choices are: rand160Bits, asmSHA1, ZSSHA, plainSHA1 (default)
    };


    if (LOCAL) {
      //first we merge the paths
      if (LOCAL.paths !== undefined) {
        for (var key in GLOBAL.paths) {
          if (!LOCAL.paths.hasOwnProperty(key)) {
            LOCAL.paths[key] = GLOBAL.paths[key];
          }
        }
      } else {
        LOCAL.path = GLOBAL.path;
      }
      //now merge the array parts
      LOCAL.pluginBasePaths = LOCAL.pluginBasePaths || [];
      LOCAL.pluginBasePaths = LOCAL.pluginBasePaths.concat(GLOBAL.pluginBasePaths);

      LOCAL.decoratorpaths = LOCAL.decoratorpaths || [];
      LOCAL.decoratorpaths = LOCAL.decoratorpaths.concat(GLOBAL.decoratorpaths);

      LOCAL.visualizerDescriptors = LOCAL.visualizerDescriptors || [];
      LOCAL.visualizerDescriptors = GLOBAL.visualizerDescriptors.concat(LOCAL.visualizerDescriptors);

      //now overwrite everything else
      for (var key in LOCAL) {
        GLOBAL[key] = LOCAL[key];
      }
    }

    return GLOBAL;
  });
}
