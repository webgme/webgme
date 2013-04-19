"use strict";

define(['logManager',
    'js/Controls/DropDownMenu'], function (logManager,
                                           DropDownMenu) {

    var LoggerStatus,
        LOG_PREFIX = "LOG: ";

    LoggerStatus = function (containerId) {
        this._logger = logManager.create("LoggerStatus");

        this._statusColors = { "OFF": "BLACK",
            "ERROR": "RED",
            "WARNING": "ORANGE",
            "INFO": "LIGHT_BLUE",
            "DEBUG":"BLUE",
            "ALL": "GRAY"};

        //initialize UI
        this._initializeUI(containerId);

        this._logger.debug("Created");
    };

    LoggerStatus.prototype._initializeUI = function (containerId) {
        var self = this,
            msg,
            i;

        //get container first
        this._el = $("#" + containerId);
        if (this._el.length === 0) {
            msg = "LoggerStatus's container with id:'" + containerId + "' could not be found";
            this._logger.error(msg);
            throw msg;
        }

        this._el.empty();

        this._dropUpMenu = new DropDownMenu({"dropUp": true,
            "pullRight": true,
            "size": "micro"});

        this._dropUpMenu.onItemClicked = function (val) {
            logManager.setLogLevel(logManager.logLevels[val]);
            self._refreshButtonText();
        };

        this._el.append(this._dropUpMenu.getEl());

        this._logLevels = _.extend({}, logManager.logLevels );
        this._logLevelsById = {};

        //get all available log status
        for (i in this._logLevels) {
            if (this._logLevels.hasOwnProperty(i)) {
                this._logLevelsById[this._logLevels[i]] = i;
            }
        }

        for (i in this._logLevelsById) {
            if (this._logLevelsById.hasOwnProperty(i)) {
                this._dropUpMenu.addItem({"text": this._logLevelsById[i],
                    "value": this._logLevelsById[i]});
            }
        }

        this._refreshButtonText();
    };

    LoggerStatus.prototype._refreshButtonText = function () {
        var currentLogLevel = logManager.getLogLevel();

        this._dropUpMenu.setTitle(LOG_PREFIX + this._logLevelsById[currentLogLevel]);
        this._dropUpMenu.setColor(this._dropUpMenu.COLORS[this._statusColors[this._logLevelsById[currentLogLevel]]]);
    };

    return LoggerStatus;
});