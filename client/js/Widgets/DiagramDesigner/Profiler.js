/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var Profiler,
        _profiles;

    Profiler = function () {
        this.clear();
    };

    Profiler.prototype.clear = function () {
        _profiles = {};
    };

    Profiler.prototype.startProfile = function (id) {
        if (_profiles.hasOwnProperty(id)) {
            //console.error('profile with ID: \'' + id + '\' already exists');
            _profiles[id].push({'start': Date.now(),
                'end': undefined});
        } else {
            _profiles[id] = [{'start': Date.now(),
                             'end': undefined}];
        }
    };

    Profiler.prototype.endProfile = function (id) {
        var l;
        if (_profiles.hasOwnProperty(id)) {
            l = _profiles[id].length;
            _profiles[id][l - 1].end = Date.now();
        } else {
            console.error('profile with ID: \'' + id + '\' does not exist');
        }
    };

    Profiler.prototype.dump = function () {
        var elapsed,
            len,
            i,
            j;
        for (i in _profiles) {
            if (_profiles.hasOwnProperty(i)) {
                len = _profiles[i].length;
                for (j = 0; j < len; j += 1) {
                    elapsed = _profiles[i][j].end - _profiles[i][j].start;
                    console.log('Profile \'' + i + '\' run_' + j + ': ' + elapsed + ' ms');
                }
            }
        }
    };

    return Profiler;
});
