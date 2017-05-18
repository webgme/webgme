/*globals define, $*/
/*jshint browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/ejs', 'js/Constants'], function (ejs, CONSTANTS) {
    'use strict';

    var SVG_CACHE = {},
        BASEDIR = '/' + CONSTANTS.ASSETS_DECORATOR_SVG_FOLDER;

    //TODO we try our best to remove the ejs portions without actual rendering, but that might not help...
    function isSvg(text) {
        text = text.split('<%');
        for (var i = 0; i < text.length; i += 1) {
            text[i] = text[i].replace(/^(.|\n)*%>/g, '');
        }
        text = text.join('');

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
                })
                .fail(function (resp, status/*, err*/) {
                    var data = resp.responseText;

                    // if the file contains a text we just save as it is cause it is most likely a template
                    if (status === 'parsererror' && typeof data === 'string') {
                        SVG_CACHE[svgFilePath] = data;
                        content = SVG_CACHE[svgFilePath];
                    }
                });
        }

        return content;
    }

    function uri(clientNodeObj, registryId) {
        var data = clientNodeObj.getEditableRegistry(registryId);

        if (typeof data === 'string' && data.length > 0) {
            if (isSvg(data) === false) {
                data = getSvgFileContent(BASEDIR + data);
            }

            try {
                data = ejs.render(data, clientNodeObj);
            } catch (e) {
                return null;
            }

            if ($(data)[0].tagName !== 'svg') {
                data = $(data).find('svg').first().prop('outerHTML');
            }

            data = 'data:image/svg+xml;base64,' + window.btoa(data);
            return data;

        }

        return null;
    }

    function content(clientNodeObj, registryId) {
        var data = clientNodeObj.getEditableRegistry(registryId);

        if (typeof data === 'string' && data.length > 0) {
            if (isSvg(data) === false) {
                data = getSvgFileContent(BASEDIR + data);
            }

            try {
                data = ejs.render(data, clientNodeObj);
            } catch (e) {
                return null;
            }

            if ($(data)[0].tagName !== 'svg') {
                data = $(data).find('svg').first().prop('outerHTML');
            }

            return $(data);
        }

        return null;
    }

    function raw(data, clientNodeObj, doRender, doUri) {

        if (typeof data === 'string' && data.length > 0) {
            if (isSvg(data)) {
            } else {
                data = getSvgFileContent(BASEDIR + data);
            }

            if (doRender === true) {
                try {
                    data = ejs.render(data, clientNodeObj);
                } catch (e) {
                    return null;
                }

                if ($(data)[0].tagName !== 'svg') {
                    data = $(data).find('svg').first().prop('outerHTML');
                }

                if (doUri === true) {
                    data = $(data).data = 'data:image/svg+xml;base64,' + window.btoa(data);
                } else {
                    data = $(data);
                }
            }

            return data;
        }

        return null;
    }

    function test(templateString, clientNodeObj) {
        try {
            ejs.render(templateString, clientNodeObj);
        } catch (e) {
            return e;
        }

        return null;
    }

    return {
        getSvgUri: uri,
        getSvgContent: content,
        getRawSvgContent: raw,
        isSvg: isSvg,
        test: test
    };
});
