/* CSS zoom control jQuery plugin v 1.0.0 */

/* GitHub source: http://github.com/rkereskenyi/jquery.csszoom */
/* N.B. This has a manual modification tagged with pmeijer */
/* jQuery CSS zoom control based on Keith Wood's plugin framework code (http://keith-wood.name/pluginFramework.html) */

(function($) { // Hide scope, no $ conflict

/* CSSZomm manager. */
function CSSZoom() {
	this._defaults = {
		zoomLevels: [0.1, 0.25, 0.5, 1, 2, 5, 10], //default zoom level values
        onZoom: null    //callback when zoom level changes, receives one parameter: zoomLevel
	};
}

$.extend(CSSZoom.prototype, {
	/* Class name added to elements to indicate already configured by this plugin. */
	markerClassName: 'css-zoom',
	/* Name of the data property for instance settings. */
	propertyName: 'CSSZoom',

    /* Class name for the label */
    _zoomLabelClass: 'css-zoom-label',

	/* Override the default settings for all plugin instances.
	   @param  options  (object) the new settings to use as defaults
	   @return  (Plugin) this object */
	setDefaults: function(options) {
		$.extend(this._defaults, options || {});
        //make sure there is zoomLevel 1 and zoomValues are sorted
        if (this._defaults.zoomLevels.indexOf(1) === -1) {
            this._defaults.zoomLevels.push(1);
        }
        this._defaults.zoomLevels.sort(function(a,b){return a-b});
		return this;
	},

	/* Attach the plugin functionality.
	   @param  target   (element) the control to affect
	   @param  options  (object) the custom options for this instance */
	_attachPlugin: function(target, options) {
		target = $(target);
		if (target.hasClass(this.markerClassName)) {
			return;
		}
		var inst = {options: $.extend({}, this._defaults),
                    zoomTarget: null,
                    zoomLevel: 1,
                    zoomLevels: [],
                    zoomLabel: undefined};

		target.addClass(this.markerClassName).data(this.propertyName, inst);

        target.slider({
            orientation: "vertical",
            min: 0,
            max: this._defaults.zoomLevels.length - 1,
            value: this._defaults.zoomLevels.indexOf(1),
            slide: function( event, ui ) {
                var inst = $(this).data(plugin.propertyName);
                inst.zoomLevel = inst.zoomLevels[ui.value];
                plugin._setZoom($(this));
            }
        });

        var sliderHandle = target.find('.ui-slider-handle');

        // Uncommented by pmeijer - do not show the magnifying glass.
        //var iconZoom = $('<i/>');
        //iconZoom.css({
        //    'display': 'inline-block',
        //    'width': '14px',
        //    'height': '14px',
        //    'background-image': 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAQAAAC1QeVaAAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfdCw8RNCzZ0dJFAAABE0lEQVQY04WQMUvDYBCG3y9NiNgqKgo5qiioRR1sS6Bjm9FJZydxL+hfcJAOjh3tUHQ0UAoFf4WouCgOLko/SzXWpqGN4DmkfBUcvOm4hzuee4H/iwpUoyfyqEaF0VQAAO2Z1TgMCIToYVBt7v/aWuZc97DEDjsnB7nuOtOOgqmGzcVjtgCAp0pFm1fvFMy+2ByhCOcfNznqNUCbBIRUEh/htwEFZ66BkSOlg5QpFVy6AMbqEaZF88xAsqFe4dnt8+ctD4MbQM9Mw0Dvs5Nv3gIx4Ch4uLr3Ayu2Ebfm5JrrrWgT4e74pf8qho4W5pEA0Ic8dSrlr8R7J0zrw+sSypddoFJeaGX6+t+chc8u+cl29u0Hh41cJ8HWfvEAAAAASUVORK5CYII=)',
        //    'background-repeat': 'no-repeat'
        //});
        //sliderHandle.append(iconZoom);

        inst.zoomLabel = $('<div/>', {'class': this._zoomLabelClass});
        sliderHandle.append(inst.zoomLabel);

        sliderHandle.on('dblclick.' + this.propertyName, function (event) {
            if (!target.hasClass(plugin.propertyName + '-disabled')) {
                inst.zoomLevel = 1;
                plugin._setZoom(target);
                event.stopPropagation();
                event.preventDefault();
            }
        });

		this._optionPlugin(target, options);
	},

	/* Retrieve or reconfigure the settings for a control.
	   @param  target   (element) the control to affect
	   @param  options  (object) the new options for this instance or
	                    (string) an individual property name
	   @param  value    (any) the individual property value (omit if options
	                    is an object or to retrieve the value of a setting)
	   @return  (any) if retrieving a value */
	_optionPlugin: function(target, options, value) {
		target = $(target);
		var inst = target.data(this.propertyName);
		if (!options || (typeof options == 'string' && value == null)) { // Get option
			var name = options;
			options = (inst || {}).options;
			return (options && name ? options[name] : options);
		}

		if (!target.hasClass(this.markerClassName)) {
			return;
		}
		options = options || {};
		if (typeof options == 'string') {
			var name = options;
			options = {};
			options[name] = value;
		}
		$.extend(inst.options, options);
		if (inst.zoomTarget && inst.zoomTarget.length > 0) {   //remove old zoom-target
            inst.zoomTarget.css({'transform-origin': '',
                                 'transform': ''});
            inst.zoomTarget = $([]);
        }
        if (options.zoomTarget) {   //add new zoom-target
            inst.zoomTarget = $(inst.options.zoomTarget);
        }
        if (options.zoomLevels) {   //add new zoom-levels
            inst.zoomLevels = [].concat(options.zoomLevels);
            if (inst.zoomLevels.indexOf(1) === -1) {
                inst.zoomLevels.push(1);
            }
            inst.zoomLevels.sort(function(a,b){return a-b});
        } else {
            inst.zoomLevels = [].concat(inst.options.zoomLevels);
        }

        target.slider( "option", "max", inst.zoomLevels.length - 1 );

        this._setZoom(target);
	},

    /* Sets the zoom on zoomtarget accordingly */
    _setZoom: function (target) {
        var inst = target.data(this.propertyName);
        var zoomLevel = inst.zoomLevel;
        var zoomTarget = inst.zoomTarget;
        var zoomLabel = inst.zoomLabel;

        zoomTarget.css({'transform-origin': '0 0',
            'transform': 'scale('+ zoomLevel + ', ' + zoomLevel + ')'});

        zoomLabel.text( zoomLevel + "x" );

        target.slider("option", "value", inst.zoomLevels.indexOf(zoomLevel));

        if (inst.options.onZoom) {
            inst.options.onZoom.apply(target, [zoomLevel]);
        }
    },

	/* Add function for 'method' command.
	   Called by $(selector).pluginname('method').
	   @param  target  (element) the control to check */
	_methodPlugin: function(target) {
		var inst = target.data(this.propertyName);
		// Implement functionality here
	},

	/* Enable the control.
	   @param  target  (element) the control to affect */
	_enablePlugin: function(target) {
		target = $(target);
		if (!target.hasClass(this.markerClassName)) {
			return;
		}
		target.prop('disabled', false).removeClass(this.propertyName + '-disabled');
		var inst = target.data(this.propertyName);

        target.slider( "enable" );
	},

	/* Disable the control.
	   @param  target  (element) the control to affect */
	_disablePlugin: function(target) {
		target = $(target);
		if (!target.hasClass(this.markerClassName)) {
			return;
		}
		target.prop('disabled', true).addClass(this.propertyName + '-disabled');
		var inst = target.data(this.propertyName);

        target.slider( "disable" );
	},

    /* Zoom in.
     @param  target  (element) the control to affect */
    _zoomInPlugin: function(target) {
        target = $(target);
        if (!target.hasClass(this.markerClassName)) {
            return;
        }
        var inst = target.data(this.propertyName);

        var zoomLevel = inst.zoomLevel;
        var zoomLevels = inst.zoomLevels;
        var idx = zoomLevels.indexOf(zoomLevel);

        if (idx < zoomLevels.length - 1) {
            inst.zoomLevel = zoomLevels[idx + 1];
        }

        this._setZoom(target);
    },

    /* Zoom out.
     @param  target  (element) the control to affect */
    _zoomOutPlugin: function(target) {
        target = $(target);
        if (!target.hasClass(this.markerClassName)) {
            return;
        }
        var inst = target.data(this.propertyName);

        var zoomLevel = inst.zoomLevel;
        var zoomLevels = inst.zoomLevels;
        var idx = zoomLevels.indexOf(zoomLevel);

        if (idx > 0) {
            inst.zoomLevel = zoomLevels[idx - 1];
        }

        this._setZoom(target);
    },

	/* Remove the plugin functionality from a control.
	   @param  target  (element) the control to affect */
	_destroyPlugin: function(target) {
		target = $(target);
		if (!target.hasClass(this.markerClassName)) {
			return;
		}
		var inst = target.data(this.propertyName);

        if (inst.zoomTarget && inst.zoomTarget.length > 0) {   //remove old zoom-target
            inst.zoomTarget.css({'transform-origin': '',
                'transform': ''});
            inst.zoomTarget = $([]);
        }

		target.removeClass(this.markerClassName).
			removeData(this.propertyName).
			unbind('.' + this.propertyName);

        target.slider( "destroy" );
	}
});

// The list of methods that return values and don't permit chaining
var getters = [];

/* Determine whether a method is a getter and doesn't permit chaining.
   @param  method     (string, optional) the method to run
   @param  otherArgs  ([], optional) any other arguments for the method
   @return  true if the method is a getter, false if not */
function isNotChained(method, otherArgs) {
	if (method == 'option' && (otherArgs.length == 0 ||
			(otherArgs.length == 1 && typeof otherArgs[0] == 'string'))) {
		return true;
	}
	return $.inArray(method, getters) > -1;
}

/* Attach the plugin functionality to a jQuery selection.
   @param  options  (object) the new settings to use for these instances (optional) or
                    (string) the method to run (optional)
   @return  (jQuery) for chaining further calls or
            (any) getter value */
$.fn.csszoom = function(options) {
	var otherArgs = Array.prototype.slice.call(arguments, 1);
	if (isNotChained(options, otherArgs)) {
		return plugin['_' + options + 'Plugin'].apply(plugin, [this[0]].concat(otherArgs));
	}
	return this.each(function() {
		if (typeof options == 'string') {
			if (!plugin['_' + options + 'Plugin']) {
				throw 'Unknown method: ' + options;
			}
			plugin['_' + options + 'Plugin'].apply(plugin, [this].concat(otherArgs));
		}
		else {
			plugin._attachPlugin(this, options || {});
		}
	});
};

/* Initialise the plugin functionality. */
var plugin = $.csszoom = new CSSZoom(); // Singleton instance

})(jQuery);
