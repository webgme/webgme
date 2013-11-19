"use strict";

define(['jquery-csszoom'], function () {

    var GraphVizWidgetZoom;

    GraphVizWidgetZoom = function () {

    };

    GraphVizWidgetZoom.prototype._initZoom = function () {
        var self = this;

        this._zoomLabel = this.toolBar.addLabel();
        this._zoomEl = this._el.find('svg');

        //zoom
        this._zoomSlider = $('<div/>');
        this._el.parent().append(this._zoomSlider);

        this._zoomSlider.csszoom({
            'zoomTarget': this._el.find('svg'),
            'onZoom': function (zoomLevel) {
                self._zoomLabel.text( "Zoom: " + zoomLevel * 100 + "%" );
            }});

        //add zoom level UI and handlers
        this._addZoomMouseHandler(this._el);
    };

    GraphVizWidgetZoom.prototype._addZoomMouseHandler = function (el) {
        var self = this;

        //MOUSE ENTER WORKAROUND
        el.attr("tabindex", 0);
        el.mouseenter(function(){
            $(this).focus();
        });

        //IE, Chrome, etc
        el.on('mousewheel', function (event){
            var org = event.originalEvent;

            if (org &&  (org.ctrlKey || org.metaKey || org.altKey)) {
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
        el.on('DOMMouseScroll', function (event){
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
