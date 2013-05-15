"use strict";

var bootstrapFile = __WebGME__DEBUG ? 'bootstrap' : 'bootstrap.min';

define(
    // 'boostrap',
    [
        'lib/bootstrap/' + bootstrapFile
    ],
    function (bootstrap) {
        return bootstrap;
    }
);