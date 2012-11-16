"use strict";

var bootstrapFile = DEBUG ? 'bootstrap' : 'bootstrap.min';

define(
    // 'boostrap',
    [
        'lib/bootstrap/' + bootstrapFile
    ],
    function (bootstrap) {
        return bootstrap;
    }
);