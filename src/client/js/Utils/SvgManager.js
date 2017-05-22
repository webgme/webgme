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
    /**
     * The function checks if the input string is a potential svg string or svg template string (and not a simple path)
     * @param {string} text - the string to check
     * @return {boolean} Returns if the checked text can be used as an svg string or template
     */
    function isSvg(text) {
        text = text || '';
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

    /**
     * The function retrieves the pointed svg asset as a base64 image source so it can be used as scr of an img tag
     * @param {GMENode} clientNodeObj - The target node where we will gather the asset
     * @param {string} registryId - The name of the registry entry that holds the svg asset which
     * can be either an svg template string or a path of the svg file
     * @return {string} The generated string should be used as the src attribute of an img tag without any modification
     */
    function getSvgUri(clientNodeObj, registryId) {
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

    /**
     * The function retrieves a sting that represents the svg asset pointed by the parameters
     * @param {GMENode} clientNodeObj - The target node where we will look for the asset.
     * @param {string} registryId - The name of the registry that contains the asset.
     * @return {string|null} The rendered or downloaded svg string which can be used to create elements
     */
    function getSvgContent(clientNodeObj, registryId) {
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

            return data;
        }

        return null;
    }

    /**
     * The function creates an svg element pointed by the parameters
     * @param {GMENode} clientNodeObj - The target client node object.
     * @param {string} registryId - The name of the registry that holds the asset
     * @return {object|null} The generated DOM element or null if no svg was found
     */
    function getSvgElement(clientNodeObj, registryId) {
        var html = getSvgContent(clientNodeObj, registryId);
        if (html === null) {
            return html;
        }

        return $(html);
    }

    /**
     * The function is able to retrieve the unrendered or rendered svg asset
     * @param {string} data - The svg string or svg template string
     * @param {GMENode} clientNodeObj - The target client node to use for rendering
     * @param {boolean} doRender - If true the data will be rendered as an ejs template
     * @param {boolean} doUri - If true, the rendered result will be translated into base64 string to use as
     * src in img tags
     * @return {string|object|null} If null returned, than either the rendering was faulty or the input
     * data is not an svg.
     */
    function getRawSvgContent(data, clientNodeObj, doRender, doUri) {

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

    /**
     * The function can check if the ejs template do generate an svg.
     * @param {string} templateString - The string to test.
     * @param {GMENode} clientNodeObj - The target node object
     * @return {error|null} Returns the ejs error if something goes wrong or null otherwise.
     */
    function testSvgTemplate(templateString, clientNodeObj) {
        try {
            ejs.render(templateString, clientNodeObj);
        } catch (e) {
            return e;
        }

        return null;
    }

    return {
        getSvgUri: getSvgUri,
        getSvgContent: getSvgContent,
        getSvgElement: getSvgElement,
        getRawSvgContent: getRawSvgContent,
        isSvg: isSvg,
        testSvgTemplate: testSvgTemplate
    };
});
