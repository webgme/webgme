/*globals define, $*/
/*jshint browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/ejs'], function (ejs) {
    'use strict';

    var SVG_CACHE = {};

    function isSvg(text) {
        return $(text).is('svg');
    }

    function getSvgFileContent(svgFilePath) {
        var content = null;

        if (SVG_CACHE[svgFilePath]) {
            content = SVG_CACHE[svgFilePath];
        } else {
            // get the svg from the server in SYNC mode, may take some time
            $.ajax(svgFilePath, {async: false})
                .done(function (data) {
                    // downloaded successfully
                    // cache the content if valid
                    var svgElements = $(data).find('svg');
                    if (svgElements.length > 0) {
                        SVG_CACHE[svgFilePath] = $(data).find('svg').first().prop('outerHTML');
                        content = SVG_CACHE[svgFilePath];
                    }
                });
        }

        return content;
    }

    function uri(clientNodeObj, registryId) {
        var data = clientNodeObj.getEditableRegistry(registryId);

        if (typeof data === 'string' && data.length > 0) {
            if (isSvg(data)) {
                if ($(data)[0].tagName !== 'svg') {
                    data = $(data).find('svg').first().prop('outerHTML');
                }
                data = ejs.render(data, clientNodeObj);
                data = 'data:image/svg+xml;base64,' + window.btoa(data);
            } else {
                data = '/assets/DecoratorSVG/' + data;
            }

            return data;

        }

        return null;
    }

    function content(clientNodeObj, registryId) {
        var data = clientNodeObj.getEditableRegistry(registryId);

        if (typeof data === 'string' && data.length > 0) {
            if (isSvg(data)) {
                if ($(data)[0].tagName !== 'svg') {
                    data = $(data).find('svg').first().prop('outerHTML');
                }
            } else {
                data = getSvgFileContent('/assets/DecoratorSVG/' + data);
            }

            try {
                data = ejs.render(data, clientNodeObj);
            } catch (e) {

            }
            return $(data);
        }

        return null;
    }

    function raw(data, clientNodeObj, doRender, doUri) {

        if (typeof data === 'string' && data.length > 0) {
            if (isSvg(data)) {
                if ($(data)[0].tagName !== 'svg') {
                    data = $(data).find('svg').first().prop('outerHTML');
                }
            } else {
                data = getSvgFileContent('/assets/DecoratorSVG/' + data);
            }

            if (doRender === true) {
                try {
                    data = ejs.render(data, clientNodeObj);
                } catch (e) {

                }
                if (doUri === true) {
                    data = 'data:image/svg+xml;base64,' + window.btoa(data);
                } else {
                    data = $(data);
                }
            }

            return data;
        }

        return null;
    }

    return {
        getSvgUri: uri,
        getSvgContent: content,
        getRawSvgContent: raw,
        isSvg: isSvg
    };
});
