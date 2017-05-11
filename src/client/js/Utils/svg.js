/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/ejs', 'q'], function (ejs, Q) {
    'use strict';

    var SVG_CACHE = {},
        CONNECTION_AREA_CLASS = 'connection-area',
        DATA_ANGLE = 'angle',
        DATA_ANGLE1 = 'angle1',
        DATA_ANGLE2 = 'angle2',
        CONN_AREA_DEFAULTS = {};

    function isSvg(text) {
        return $(text).is('svg');
    }

    function buildConnecitonAreas(svgContent) {
        var svgElement = svgContent.el,
            connAreas = svgElement.find('.' + CONNECTION_AREA_CLASS),
            len = connAreas.length,
            line,
            connA,
            lineData,
            dx,
            dy,
            alpha,
            svgWidth,
            viewBox,
            ratio = 1,
            customConnectionAreas = svgContent.customConnectionAreas;

        if (len > 0) {
            svgWidth = parseInt(svgElement.attr('width'), 10);
            viewBox = svgElement[0].getAttribute('viewBox');
            if (viewBox) {
                var vb0 = parseInt(viewBox.split(' ')[0], 10);
                var vb1 = parseInt(viewBox.split(' ')[2], 10);
                ratio = svgWidth / (vb1 - vb0);
            }

            while (len--) {
                line = $(connAreas[len]);
                connA = {
                    id: line.attr('id'),
                    x1: parseInt(line.attr('x1'), 10) * ratio,
                    y1: parseInt(line.attr('y1'), 10) * ratio,
                    x2: parseInt(line.attr('x2'), 10) * ratio,
                    y2: parseInt(line.attr('y2'), 10) * ratio
                };

                //try to figure out meta info from the embedded SVG
                lineData = line.data();

                _.extend(connA, CONN_AREA_DEFAULTS);
                _.extend(connA, lineData);

                if (!lineData.hasOwnProperty(DATA_ANGLE) && !(lineData.hasOwnProperty(DATA_ANGLE1) &&
                    lineData.hasOwnProperty(DATA_ANGLE2))) {

                    dx = connA.x2 - connA.x1;
                    dy = connA.y2 - connA.y1;
                    if (dx !== 0 && dy !== 0) {
                        alpha = Math.atan(dy / dx) * (180 / Math.PI);
                        if (dx > 0) {
                            alpha = 270 + alpha;
                        } else if (dx < 0) {
                            alpha = 90 + alpha;
                        }
                    } else if (dx === 0 && dy !== 0) {
                        //conn area is vertical
                        alpha = dy > 0 ? 0 : 180;
                    } else if (dx !== 0 && dy === 0) {
                        //conn area is horizontal
                        alpha = dx > 0 ? 270 : 90;
                    }

                    connA.angle1 = alpha;
                    connA.angle2 = alpha;
                }

                customConnectionAreas.push(connA);

                //finally remove the placeholder from the SVG
                line.remove();
            }
        }
    }

    function getSvgFilecontent(svgFilePath) {
        var deferred = Q.defer();

        if (SVG_CACHE[svgFilePath]) {
            deferred.resolve(SVG_CACHE[svgFilePath]);
        } else {
            // get the svg from the server in SYNC mode, may take some time
            $.ajax(svgFilePath, {async: false})
                .done(function (data) {
                    // downloaded successfully
                    // cache the content if valid
                    var svgElements = $(data).find('svg');
                    if (svgElements.length > 0) {
                        SVG_CACHE[svgFilePath] = $(data).find('svg').first().prop('outerHTML');
                        deferred.resolve(SVG_CACHE[svgFilePath]);
                    } else {
                        deferred.resolve(null);
                    }
                })
                .fail(function () {
                    deferred.resolve(null);
                });
        }

        return deferred.promise;
    }

    function uri(clientNodeObj, registryId) {
        var data = clientNodeObj.getEditableRegistry(registryId);

        if (typeof data === 'string') {
            if (isSvg(data)) {
                data = $(data).find('svg').first().prop('outerHTML');
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
        var data = clientNodeObj.getEditableRegistry(registryId),
            contentObj = {el: null, customConnectionAreas: []},
            deferred = Q.defer();

        if (typeof data === 'string') {
            if (isSvg(data)) {
                data = $(data).find('svg').first().prop('outerHTML');
                data = ejs.render(data, clientNodeObj);

                contentObj.el = $(data);
                buildConnecitonAreas(contentObj);
                deferred.resolve(contentObj);
            } else {
                getSvgFilecontent('/assets/DecoratorSVG/' + data)
                    .then(function (data_) {
                        data = data_;
                        data = ejs.render(data, clientNodeObj);

                        contentObj.el = $(data);
                        buildConnecitonAreas(contentObj);
                        deferred.resolve(contentObj);
                    })
                    .catch(deferred.reject);
            }

        } else {
            deferred.resolve(null);
        }

        return deferred.promise;
    }

    return {
        getSvgUri: uri,
        getSvgContent: content
    };
});
