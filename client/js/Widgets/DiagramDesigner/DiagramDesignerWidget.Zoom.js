"use strict";

define([], function () {

    var DiagramDesignerWidgetZoom;

    DiagramDesignerWidgetZoom = function () {

    };

    DiagramDesignerWidgetZoom.prototype._initZoom = function () {
        if (this._zoomValues.indexOf(1) === -1) {
            this._zoomValues.push(1);
        }
        this._zoomValues.sort();
        this._zoomLevelMin = 0;
        this._zoomLevelMax = this._zoomValues.length - 1;
        this._zoomLevel = this._zoomValues.indexOf(1);

        this._initZoomUIControl();
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
                self.setZoomLevel(ui.value);
            }
        });

        this._zoomSlider.find('.ui-slider-handle').html('<i class="icon-search"></i>');

        this._zoomLabel = $('<div/>', {'class': 'diagram-designer-zoom-label'});

        this._zoomSlider.find('.ui-slider-handle').append(this._zoomLabel);

        this.zoom(this._zoom);

        //add zoom level UI and handlers
        this._addZoomMouseHandler(this.$el);
    };

    DiagramDesignerWidgetZoom.prototype.setZoomLevel = function (val) {
        if (val >= this._zoomLevelMin && val <= this._zoomLevelMax) {
            if (this._zoomLevel !== val) {
                this._zoomLevel = val;

                this.zoom(this._zoomValues[this._zoomLevel]);

                this._zoomSlider.slider( "option", "value", this._zoomLevel );
            }
        }
    };

    DiagramDesignerWidgetZoom.prototype.zoom = function (val) {
        this._zoom = val;

        this.skinParts.$itemsContainer.css({'transform-origin': '0 0',
            'transform': 'scale('+ this._zoom + ', ' + this._zoom + ')'});

        this._zoomLabel.text( this._zoom + "x" );

        this._resizeItemContainer();
    };

    DiagramDesignerWidgetZoom.prototype.zoomIn = function () {
        this.setZoomLevel(this._zoomLevel + 1);
    };

    DiagramDesignerWidgetZoom.prototype.zoomOut = function () {
        this.setZoomLevel(this._zoomLevel - 1);
    };

    DiagramDesignerWidgetZoom.prototype._addZoomMouseHandler = function (el) {
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
