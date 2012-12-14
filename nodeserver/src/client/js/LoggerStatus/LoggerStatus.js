"use strict";

define(['logManager',
    'text!./LoggerStatusTmpl.html'], function (logManager,
                                               loggerStatusTmpl) {

    var LoggerStatus,
        LOG_PREFIX = "LOG: ";

    LoggerStatus = function (containerId) {
        this._logger = logManager.create("LoggerStatus");

        this._statusClasses = { "OFF": "btn-inverse",
            "ERROR": "btn-danger",
            "WARNING": "btn-warning",
            "INFO": "btn-info",
            "DEBUG":"btn-primary",
            "ALL": "btn-gray"};

        //initialize UI
        this._initializeUI(containerId);

        if (this._el.length === 0) {
            this._logger.error("LoggerStatus can not be created");
        } else {
            this._logger.debug("Created");
        }
    };

    LoggerStatus.prototype._initializeUI = function (containerId) {
        var self = this,
            i,
            li;

        //get container first
        this._el = $("#" + containerId);
        if (this._el.length === 0) {
            this._logger.warning("LoggerStatus's container with id:'" + containerId + "' could not be found");
            throw "LoggerStatus can not be created";
        }

        this._el.empty().html(loggerStatusTmpl);

        this._skinParts = {};
        this._skinParts.btnStatus = this._el.find(".btnStatus");
        this._skinParts.btnStatusDropDown = this._el.find(".btnStatusDropDown");
        this._skinParts.dropdownMenu = this._el.find(".dropdown-menu");

        this._logLevels = _.extend({}, logManager.logLevels );
        this._logLevelsById = {};

        //get all available log status
        for (i in this._logLevels) {
            if (this._logLevels.hasOwnProperty(i)) {
                this._logLevelsById[this._logLevels[i]] = i;
                li = ('<li><a tabindex="-1" href="#" data-val="' + i + '">' + i + '</a></li>');
                this._skinParts.dropdownMenu.append($(li));
            }
        }

        this._refreshButtonText();


        this._skinParts.dropdownMenu.on("click", function (event) {
            var level = $(event.target).data("val");
            logManager.setLogLevel(logManager.logLevels[level]);
            self._refreshButtonText();
        });
    };

    LoggerStatus.prototype._refreshButtonText = function () {
        var currentLogLevel = logManager.getLogLevel(),
            i;

        this._skinParts.btnStatus.text(LOG_PREFIX + this._logLevelsById[currentLogLevel]);

        for (i in this._statusClasses) {
            if (this._statusClasses.hasOwnProperty(i)) {
                this._skinParts.btnStatus.removeClass(this._statusClasses[i]);
                this._skinParts.btnStatusDropDown.removeClass(this._statusClasses[i]);
            }
        }

        this._skinParts.btnStatus.addClass(this._statusClasses[this._logLevelsById[currentLogLevel]]);
        this._skinParts.btnStatusDropDown.addClass(this._statusClasses[this._logLevelsById[currentLogLevel]]);
    };

    return LoggerStatus;
});