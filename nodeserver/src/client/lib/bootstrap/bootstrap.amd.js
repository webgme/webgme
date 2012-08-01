"use strict";

var bootstrapFile = DEBUG ? 'bootstrap' : 'bootstrap.min';

define(
    // 'boostrap',
    [
        'jquery',
        'lib/bootstrap/' + bootstrapFile
    ],
    function (jquery, bootstrap) {
        return bootstrap;
    }
);