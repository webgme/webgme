/*globals define, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Widgets/ZoomWidget/ZoomWidget'], function (ZoomWidget) {

    'use strict';

    var DiagramDesignerWidgetZoom;

    DiagramDesignerWidgetZoom = function () {
    };

    DiagramDesignerWidgetZoom.prototype._initZoom = function (params) {
        var self = this,
            zoomValues = params.zoomValues,
            zoomWidget = new ZoomWidget({
                class: 'diagram-designer-zoom-container',
                sliderClass: 'diagram-designer-zoom-slider',
                zoomTarget: this.skinParts.$itemsContainer,
                zoomValues: zoomValues,
                onZoom: function (zoomLevel) {
                    self._zoomRatio = zoomLevel;
                    self._resizeItemContainer();
                }
            });

        this._zoomSlider = zoomWidget.$zoomSlider;
        this.$el.parent().append(zoomWidget.$zoomContainer);

        //add zoom level UI and handlers
        this._addZoomMouseHandler(this.$el);
    };

    DiagramDesignerWidgetZoom.prototype._addZoomMouseHandler = function (el) {
        var self = this;

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


    return DiagramDesignerWidgetZoom;
});
