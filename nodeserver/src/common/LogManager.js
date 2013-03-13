/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */
"use strict";

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

/*
 * -------- LOGMANAGER -------
 */

define([], function () {

    var logLevels = {
            "ALL" : 5,
            "DEBUG" : 4,
            "INFO" : 3,
            "WARNING" : 2,
            "ERROR" : 1,
            "OFF" : 0
        },
        logColors = {
            "DEBUG" : "90",
            "INFO" : "36",
            "WARNING" : "33",
            "ERROR" : "31"
        },
        currentLogLevel = logLevels.WARNING,
        useColors = false,
        excludedComponents = [],
        Logger,
        isComponentAllowedToLog;

    isComponentAllowedToLog = function (componentName) {
        var i,
            excludedComponentName;

        for (i = 0; i < excludedComponents.length; i += 1) {
            excludedComponentName = excludedComponents[i];

            if (excludedComponentName.substr(-1) === "*") {
                excludedComponentName = excludedComponentName.substring(0, excludedComponentName.length - 1);

                if (componentName.substring(0, excludedComponentName.length) === excludedComponentName) {
                    return false;
                }
            } else {
                if (excludedComponentName === componentName) {
                    return false;
                }
            }

        }

        return true;
    };

    Logger = function (componentName) {
        var logMessage = function (level, msg) {
            var logTime = new Date(),
                logTimeStr = (logTime.getHours() < 10) ? "0" + logTime.getHours() : logTime.getHours(),
                levelStr = level,
                concreteLogger = console.log;
            if (isComponentAllowedToLog(componentName) === true) {
                if (currentLogLevel > logLevels.OFF) {
                    //log only what meets configuration
                    if (logLevels[level] <= currentLogLevel) {
                        //see whether console exists
                        if (console && console.log) {
                            logTimeStr += ":";
                            logTimeStr += (logTime.getMinutes() < 10) ? "0" + logTime.getMinutes() : logTime.getMinutes();
                            logTimeStr += ":";
                            logTimeStr += (logTime.getSeconds() < 10) ? "0" + logTime.getSeconds() : logTime.getSeconds();
                            logTimeStr += ".";
                            logTimeStr += (logTime.getMilliseconds() < 10) ? "00" + logTime.getMilliseconds() : ((logTime.getMilliseconds() < 100) ? "0" + logTime.getMilliseconds() : logTime.getMilliseconds());

                            if (useColors === true) {
                                levelStr  = '\u001B[' + logColors[level] + 'm' + level + '\u001B[39m';
                            }

                            if ((logLevels[level] === logLevels.ERROR) && (console.error)) {
                                concreteLogger = console.error;
                            }

                            if ((logLevels[level] === logLevels.WARNING) && (console.warn)) {
                                concreteLogger = console.warn;
                            }

                            if ((logLevels[level] === logLevels.INFO) && (console.info)) {
                                concreteLogger = console.info;
                            }

                            concreteLogger.call(console, levelStr + " - " + logTimeStr + " [" + componentName + "] - " + msg);
                        }
                    }
                }
            }
        };

        this.debug = function (msg) {
            logMessage("DEBUG", msg);
        };

        this.info = function (msg) {
            logMessage("INFO", msg);
        };

        this.warning = function (msg) {
            logMessage("WARNING", msg);
        };
        
        this.warn = function (msg) {
            logMessage("WARNING", msg);
        };

        this.error = function (msg) {
            logMessage("ERROR", msg);
        };
    };

    return {
        logLevels : logLevels,

        setLogLevel : function (level) {
            if ((level >= 0) && (level <= logLevels.ALL)) {
                currentLogLevel = level;
            }
        },

        getLogLevel : function () {
            return currentLogLevel;
        },

        useColors : function (enabled) {
            if ((enabled === true) || (enabled === false)) {
                useColors = enabled;
            } else {
                useColors = false;
            }
        },

        create : function (componentName) {
            return new Logger(componentName);
        },

        excludeComponent : function (componentName) {
            if (excludedComponents.indexOf(componentName) === -1) {
                excludedComponents.push(componentName);
            }
        }
    };
});

