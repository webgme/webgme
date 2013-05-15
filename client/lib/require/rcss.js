"use strict";

(function () {

    var head = document.getElementsByTagName("head")[0];

    function loadCSS(url, loadCallBack) {
        var css	= document.createElement('link');
        css.rel		= 'stylesheet';
        css.type	= 'text/css';
        css.media	= 'all';
        css.href	= url;
        if (loadCallBack) {
            css.onload = function () {
                loadCallBack();
            };
        }
        head.appendChild(css);
    }

    define(function () {
        var rcss;

        rcss = {
            load: function (name, req, load) { //, config (not used)
                // convert name to actual url
                var url = req.toUrl(
                    // Append default extension
                    name.search(/\.(css|less|scss)$/i) === -1 ? name + '.css' : name
                );

                loadCSS(url, load);
            }
        };

        return rcss;
    });
}());