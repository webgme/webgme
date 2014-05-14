(function( debug ) {
"use strict";

var bootstrapJSFile,
    bootstrapCSSFile,
    bootsrapThemeCSSFile;

    if ( debug ) {

        bootstrapJSFile = 'bootstrap.js';
        bootstrapCSSFile = 'bootstrap.css';
        bootstrapThemeCSSFile = 'bootstrap.css';

    } else {

        bootstrapJSFile = 'bootstrap.min.js';

    }


define(
    // 'boostrap',
    [
        'lib/bootstrap/' + _bootsrapVersion + '/js/'+ bootstrapJSFile,
        'css!/lib/bootstrap/' + _bootsrapVersion + '/css/'+ bootstrapCSSFile
    ],
    function (bootstrap) {
        return bootstrap;
    }
);

})( window.DEBUG );