/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

/*
 * -------- LOGMANAGER -------
 */

define( [], function(){

    var logLevels = {
        "ALL" : 5,
        "DEBUG" : 4,
        "INFO" : 3,
        "WARNING" : 2,
        "ERROR" : 1,
        "OFF" : 0
    };

    var logColors = {
        "DEBUG" : "90",
        "INFO" : "36",
        "WARNING" : "33",
        "ERROR" : "31"
    };

    var currentLogLevel = logLevels.ERROR;

    var useColors = false;

    var Logger = function( componentName ) {

        var logMessage = function( level, msg ) {
            if ( currentLogLevel > logLevels.OFF ) {
                //log only what meets configuration
                if (  logLevels[level] <= currentLogLevel ) {
                    //see whether console exists
                    if ( console && console.log ) {
                        var logTime = new Date();

                        var logTimeStr = (logTime.getHours() < 10 ) ? "0" + logTime.getHours() : logTime.getHours();
                        logTimeStr += ":";
                        logTimeStr += (logTime.getMinutes() < 10 ) ? "0" + logTime.getMinutes() : logTime.getMinutes();
                        logTimeStr += ":";
                        logTimeStr += (logTime.getSeconds() < 10 ) ? "0" + logTime.getSeconds() : logTime.getSeconds();
                        logTimeStr += ".";
                        logTimeStr += (logTime.getMilliseconds() < 10 ) ? "00" + logTime.getMilliseconds() : ( (logTime.getMilliseconds() < 100 ) ? "0" + logTime.getMilliseconds() : logTime.getMilliseconds() );

                        var levelStr = level;
                        if ( useColors === true ) {
                            levelStr  = '\033[' + logColors[level] +'m' + level + '\033[39m';
                        }

                        console.log( levelStr + " - " + logTimeStr + " [" + componentName + "] - " + msg );
                    }
                }
            }
        };

        this.debug = function( msg ) {
            logMessage( "DEBUG", msg );
        } ;

        this.info = function( msg ) {
            logMessage( "INFO", msg );
        } ;

        this.warning = function( msg ) {
            logMessage( "WARNING", msg );
        } ;

        this.error = function( msg ) {
            logMessage( "ERROR", msg );
        } ;
    };

    return {
        logLevels : logLevels,

        setLogLevel : function( level ) {
            if ( ( level >= 0 ) && ( level <= logLevels.ALL ) ) {
                currentLogLevel = level;
            }
        },

        useColors : function( enabled ) {
            if ( ( enabled === true ) || ( enabled === false ) ) {
                useColors = enabled;
            } else {
                useColors = false;
            }
        },

        create : function( componentName ) {
            return new Logger( componentName );
        }
    };
});

