/*globals define*/
/*
 * @author brollb / https://github/brollb
 */
define(['jquery-csszoom'], function () {

    "use strict";

    var BlockEditorWidgetZoom,
        DEFAULT_ZOOM_VALUES = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10];

    BlockEditorWidgetZoom = function () {
    };

    BlockEditorWidgetZoom.prototype._initZoom = function (params) {
        var self = this,
            zoomValues = params.zoomValues || DEFAULT_ZOOM_VALUES;

        //zoom
        this._zoomSlider = $('<div/>', { 'class': 'block-editor-zoom' });
        this.$el.parent().append(this._zoomSlider);

        this._zoomSlider.csszoom({
            'zoomTarget': this.skinParts.$itemsContainer,
            'zoomLevels': zoomValues,
            'onZoom': function (zoomLevel) {
                self._zoomRatio = zoomLevel;
                self._resizeItemContainer();
            }});

        //add zoom level UI and handlers
        this._addZoomMouseHandler(this.$el);
    };

    BlockEditorWidgetZoom.prototype._addZoomMouseHandler = function (el) {
        var self = this;

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


    return BlockEditorWidgetZoom;
});
