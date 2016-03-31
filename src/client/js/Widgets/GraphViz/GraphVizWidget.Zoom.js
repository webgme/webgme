/*globals define, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Widgets/ZoomWidget/ZoomWidget'], function (ZoomWidget) {

    'use strict';

    var GraphVizWidgetZoom;

    GraphVizWidgetZoom = function () {

    };

    GraphVizWidgetZoom.prototype._initZoom = function (opts) {
        opts = opts || {};
        var zoomWidget = new ZoomWidget({
            zoomValues: opts.zoomValues,
            class: 'graph-viz-zoom-container',
            sliderClass: 'graph-viz-zoom-slider',
            zoomTarget: this._el.find('svg')
        });

        this._zoomSlider = zoomWidget.$zoomSlider;
        this._el.parent().append(zoomWidget.$zoomContainer);

        //add zoom level UI and handlers
        this._addZoomMouseHandler(this._el);
    };

    GraphVizWidgetZoom.prototype._addZoomMouseHandler = function (el) {
        var self = this;

        //MOUSE ENTER WORKAROUND
        el.attr('tabindex', 0);
        el.mouseenter(function () {
            $(this).focus();
        });

        //IE, Chrome, etc
        el.on('mousewheel', function (event) {
            var org = event.originalEvent;

            if (org && (org.ctrlKey || org.metaKey || org.altKey)) {
                //CTRL + mouse scroll
                if (org.wheelDelta < 0) {
                    self._zoomSlider.csszoom('zoomOut');
                } else {
                    self._zoomSlider.csszoom('zoomIn');
                }

                event.stopPropagation();
                event.preventDefault();
            }
        });

        //FIREFOX
        el.on('DOMMouseScroll', function (event) {
            var org = event.originalEvent;

            if (org && (org.ctrlKey || org.metaKey || org.altKey)) {
                //CTRL + mouse scroll
                if (org.detail > 0) {
                    self._zoomSlider.csszoom('zoomOut');
                } else {
                    self._zoomSlider.csszoom('zoomIn');
                }

                event.stopPropagation();
                event.preventDefault();
            }
        });
    };


    return GraphVizWidgetZoom;
});
