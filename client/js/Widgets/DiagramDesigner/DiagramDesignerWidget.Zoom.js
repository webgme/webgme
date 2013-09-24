"use strict";

define([], function () {

    var DiagramDesignerWidgetZoom,
        DEFAULT_ZOOM_VALUES = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10];

    DiagramDesignerWidgetZoom = function () {
    };

    DiagramDesignerWidgetZoom.prototype._initZoom = function (params) {
        this._zoomValues = params.zoomValues || DEFAULT_ZOOM_VALUES;
        if (this._zoomValues.indexOf(1) === -1) {
            this._zoomValues.push(1);
        }
        this._zoomValues.sort(function(a,b){return a-b});
        this._zoomLevelMin = 0;
        this._zoomLevelMax = this._zoomValues.length - 1;
        this._zoomLevel = this._zoomValues.indexOf(1);

        if (params.zoomUIControls === true) {
            this._initZoomUIControl();
        }

        //add zoom level UI and handlers
        this._addZoomMouseHandler(this.$el);
    };

    DiagramDesignerWidgetZoom.prototype._initZoomUIControl = function () {
        var self = this;

        //zoom
        this._zoomSlider = $('<div/>', {'class': 'diagram-designer-zoom'});
        this.$el.parent().append(this._zoomSlider);

        this._zoomSlider.slider({
            orientation: "vertical",
            min: this._zoomLevelMin,
            max: this._zoomLevelMax,
            value: this._zoomLevel,
            slide: function( event, ui ) {
                self._setZoomLevel(ui.value);
            }
        });

        this._zoomSlider.find('.ui-slider-handle').html('<i class="icon-search"></i>');

        this._zoomLabel = $('<div/>', {'class': 'diagram-designer-zoom-label'});

        this._zoomSlider.find('.ui-slider-handle').append(this._zoomLabel);

        this.setZoom(this._zoomRatio);

        this._zoomSlider.find('.ui-slider-handle').on('dblclick', function (event) {
            self.setZoom(1);
            event.stopPropagation();
            event.preventDefault();
        });
    };

    DiagramDesignerWidgetZoom.prototype._setZoomLevel = function (val) {
        if (val >= this._zoomLevelMin && val <= this._zoomLevelMax) {
            if (this._zoomLevel !== val) {
                this._zoomLevel = val;
                this.setZoom(this._zoomValues[this._zoomLevel]);
            }
        }
    };

    DiagramDesignerWidgetZoom.prototype.setZoom = function (val) {
        this._zoomRatio = val;

        this.skinParts.$itemsContainer.css({'transform-origin': '0 0',
            'transform': 'scale('+ this._zoomRatio + ', ' + this._zoomRatio + ')'});

        if (this._zoomLabel) {
            this._zoomLabel.text( this._zoomRatio + "x" );
        }

        if (this._zoomSlider) {
            this._zoomLevel = this._zoomValues.indexOf(this._zoomRatio);
            if (this._zoomLevel === -1) {
                //get the value which is closest to the selected zoomRatio
                this._zoomLevel = 0;
                while (this._zoomLevel <= this._zoomLevelMax && this._zoomValues[this._zoomLevel] <= this._zoomRatio) {
                    this._zoomLevel += 1;
                }
            }

            this._zoomSlider.slider( "option", "value", this._zoomLevel );
        }

        this._resizeItemContainer();
    };

    DiagramDesignerWidgetZoom.prototype.getZoom = function () {
        return this._zoomRatio;
    };

    DiagramDesignerWidgetZoom.prototype.zoomIn = function () {
        this._setZoomLevel(this._zoomLevel + 1);
    };

    DiagramDesignerWidgetZoom.prototype.zoomOut = function () {
        this._setZoomLevel(this._zoomLevel - 1);
    };

    DiagramDesignerWidgetZoom.prototype._addZoomMouseHandler = function (el) {
        var self = this;

        //IE, Chrome, etc
        el.on('mousewheel', function (event){
            var org = event.originalEvent;

            if (org &&  (org.ctrlKey || org.metaKey || org.altKey)) {
                //CTRL + mouse scroll
                if (org.wheelDelta < 0) {
                    self.zoomOut();
                } else {
                    self.zoomIn();
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
                    self.zoomOut();
                } else {
                    self.zoomIn();
                }

                event.stopPropagation();
                event.preventDefault();
            }
        });
    };


    return DiagramDesignerWidgetZoom;
});
