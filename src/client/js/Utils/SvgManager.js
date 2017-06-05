/*globals define, $*/
/*jshint browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
    'common/util/ejs',
    'js/Constants',
    'text!assets/decoratorSVGList.json'
], function (ejs, CONSTANTS, DecoratorSVGIconList) {
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
        var result = false;

        if (DecoratorSVGIconList.indexOf(text) > -1) {
            return false;
        }

        text = text || '';
        text = text.split('<%');
        for (var i = 0; i < text.length; i += 1) {
            text[i] = text[i].replace(/^(.|\n)*%>/g, '');
        }
        text = text.join('');

        try {
            result = $(text).is('svg');
        } catch (e) {
            result = false;
        }

        return result;
    }

    function getSvgFileContent(svgFilePath) {
        var content = null;

        if (SVG_CACHE[svgFilePath]) {
            content = SVG_CACHE[svgFilePath];
        } else {
            // get the svg from the server in SYNC mode, may take some time
            $.ajax(svgFilePath, {async: false})
                .done(function (data) {
                    if (svgFilePath.indexOf('.ejs') === svgFilePath.length - '.ejs'.length) {
                        SVG_CACHE[svgFilePath] = data;
                        content = SVG_CACHE[svgFilePath];
                    } else if (svgFilePath.indexOf('.svg') === svgFilePath.length - '.svg'.length) {
                        var svgElements = $(data).find('svg');
                        if (svgElements.length > 0) {
                            SVG_CACHE[svgFilePath] = $(data).find('svg').first().prop('outerHTML');
                            content = SVG_CACHE[svgFilePath];
                        }
                    }
                })
                .fail(function (/*resp, status, err*/) {

                });
        }

        return content;
    }

    /**
     * Returns the uri for embedding the svg inside an img element. If the stored registry is an embedded
     * svg or ejs, the content will be rendered and a data link generated.
     * @param {GMENode} clientNodeObj - The target node where we will gather the asset
     * @param {string} registryId - The name of the registry entry that holds the svg asset which
     * can be either an svg template string or a path of the svg file
     * @return {string} The generated string should be used as the src attribute of an img tag without any modification
     */
    function getSvgUri(clientNodeObj, registryId) {
        var data = clientNodeObj.getEditableRegistry(registryId);

        if (typeof data === 'string' && data.length > 0) {

            if (isSvg(data) === true) {
                try {
                    data = ejs.render(data, clientNodeObj);

                    if ($(data)[0].tagName !== 'svg') {
                        data = $(data).find('svg').first().prop('outerHTML');
                    }

                    return 'data:image/svg+xml;base64,' + window.btoa(data);
                } catch (e) {
                    return null;
                }
            } else if (DecoratorSVGIconList.indexOf(data) > -1) {
                return BASEDIR + data;
            } else {
                return null;
            }
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
            if (isSvg(data)) {
                try {
                    data = ejs.render(data, clientNodeObj);
                    if ($(data)[0].tagName !== 'svg') {
                        data = $(data).find('svg').first().prop('outerHTML');
                    }

                    return data;
                } catch (e) {
                    return null;
                }
            } else if (data.indexOf('.svg') === data.length - '.svg'.length) {
                return getSvgFileContent(BASEDIR + data);
            } else {
                return null;
            }
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
            return null;
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
        var svgContent;

        try {
            svgContent = ejs.render(templateString, clientNodeObj);
            if ($(svgContent).is('svg') === false) {
                throw new Error('Rendered template is not a proper svg.');
            }
        } catch (e) {
            return e;
        }

        return null;
    }

    return {
        getSvgUri: getSvgUri,
        getSvgContent: getSvgContent,
        getSvgElement: getSvgElement,

        //
        getRawSvgContent: getRawSvgContent,
        isSvg: isSvg,
        testSvgTemplate: testSvgTemplate
    };
});
