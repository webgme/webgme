/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */
"use strict";

/*
 * -------- LOGMANAGER -------
 */

define([], function () {

	var logLevels = {
		"ALL": 5,
		"DEBUG": 4,
		"INFO": 3,
		"WARNING": 2,
		"ERROR": 1,
		"OFF": 0
	},
    logColors = {
		"DEBUG": "90",
		"INFO": "36",
		"WARNING": "33",
		"ERROR": "31"
	},
    currentLogLevel = logLevels.WARNING,
    useColors = false,
    excludedComponents = [],
    FS = null,
    logFilePath = null,
    logFileBuffer = [],
    Logger,
    isComponentAllowedToLog,
    printLogMessageToFile,
    logMessage;

	isComponentAllowedToLog = function (componentName) {
		var i, excludedComponentName;

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

	printLogMessageToFile = function () {
		var message = logFileBuffer[0];
		if (message) {
			FS.appendFile(logFilePath, message, function (err) {
				logFileBuffer.shift();
				if (err) {
					//something wrong so we should fallback to console logging
					logFilePath = null;
					logFileBuffer = [];
				} else {
					if (logFileBuffer.length > 0) {
						printLogMessageToFile();
					}
				}
			});
		}
	};

	logMessage = function (level, componentName, msg) {
		var logTime = new Date(), logTimeStr = (logTime.getHours() < 10) ? "0" + logTime.getHours() : logTime.getHours(), levelStr = level, concreteLogger = console.log;

		//logTimeString
		logTimeStr += ":";
		logTimeStr += (logTime.getMinutes() < 10) ? "0" + logTime.getMinutes() : logTime.getMinutes();
		logTimeStr += ":";
		logTimeStr += (logTime.getSeconds() < 10) ? "0" + logTime.getSeconds() : logTime.getSeconds();
		logTimeStr += ".";
		logTimeStr += (logTime.getMilliseconds() < 10) ? "00" + logTime.getMilliseconds() : ((logTime.getMilliseconds() < 100) ? "0" + logTime.getMilliseconds() : logTime.getMilliseconds());

		//levelStr
		if (useColors === true && logFilePath === null) {
			levelStr = '\u001B[' + logColors[level] + 'm' + level + '\u001B[39m';
		}

		if (isComponentAllowedToLog(componentName) === true) {
			if (logFilePath) {
				msg = levelStr + " - " + logTimeStr + " [" + componentName + "] - " + msg + "\n";
				if (logFileBuffer.length === 0) {
					logFileBuffer.push(msg);
					printLogMessageToFile();
				} else {
					logFileBuffer.push(msg);
				}
			} else {
				//console logging
				//log only what meets configuration
				if (logLevels[level] <= currentLogLevel) {
					//see whether console exists
					if (console && console.log) {

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

	Logger = function (componentName) {
		this.debug = function (msg) {
			logMessage("DEBUG", componentName, msg);
		};

		this.info = function (msg) {
			logMessage("INFO", componentName, msg);
		};

		this.warning = function (msg) {
			logMessage("WARNING", componentName, msg);
		};

		this.warn = function (msg) {
			logMessage("WARNING", componentName, msg);
		};

		this.error = function (msg) {
			logMessage("ERROR", componentName, msg);
		};
	};

    var _setLogLevel = function (level) {
        if ((level >= 0) && (level <= logLevels.ALL)) {
            currentLogLevel = level;
        }
    };

    var _getLogLevel = function () {
        return currentLogLevel;
    };

    var _setFileLogPath = function (logPath) {
        if (FS === null) {
            try {
                FS = require('fs');
                if (FS.appendFile) {
                    logFilePath = logPath;
                }
            } catch (e) {
                FS = {};
                logFilePath = null;
            }
        } else {
            if (FS.appendFile) {
                logFilePath = logPath;
            }
        }
    };

    var _getFileLogPath = function () {
        return logFilePath;
    };

    var _useColors = function (enabled) {
        if ((enabled === true) || (enabled === false)) {
            useColors = enabled;
        } else {
            useColors = false;
        }
    };

    var _excludeComponent = function (componentName) {
        if (excludedComponents.indexOf(componentName) === -1) {
            excludedComponents.push(componentName);
        }
    };

	return {
		logLevels: logLevels,
		setLogLevel: _setLogLevel,
		getLogLevel: _getLogLevel,

		// this function is only for server side!!!
		setFileLogPath:_setFileLogPath,
		getFileLogPath: _getFileLogPath,

		useColors: _useColors,
        excludeComponent: _excludeComponent,

		create: function (componentName) {
			return new Logger(componentName);
		}
	};
});
