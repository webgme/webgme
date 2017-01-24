/*globals define, $*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';

    function MetaInconsistencyResultWidget(parentEl, options) {
        this._el = $('<div/>', {
            class: 'meta-inconsistency-results'
        });

        this._dividerAtTop = options.dividerAtTop || false;
        this._dividerAtBottom = options.dividerAtBottom || false;

        this._onLinkClick = function () {
            var path = $(this).data('gme-id');

            if (typeof options.onLinkClick === 'function') {
                options.onLinkClick(path);
            }
        };

        parentEl.append(this._el);
    }

    MetaInconsistencyResultWidget.prototype.showResults = function(results) {
        var resEl,
            dl,
            i,j;

        results.sort(function (r1, r2) {
            if (r1.message > r2.message) {
                return 1;
            } else if (r1.message < r2.message) {
                return -1;
            }

            return 0;
        });

        for (i = 0; i < results.length; i += 1) {
            if (i > 0 || this._dividerAtTop) {
                this._el.append($('<div>', {class: 'meta-inconsistency-divider'}));
            }

            resEl = $('<div>', {
                class: 'meta-inconsistency',
            });

            dl = $('<dl>', {class: 'dl-horizontal'});

            dl.append($('<dt>', {text: 'Inconsistency'}));
            dl.append($('<dd>', {text: results[i].message}));

            dl.append($('<dt>', {text: 'Description'}));
            dl.append($('<dd>', {text: results[i].description}));

            dl.append($('<dt>', {text: 'Hint'}));
            dl.append($('<dd>', {text: results[i].hint}));

            dl.append($('<dt>', {text: 'Node path'}));
            dl.append($('<dd>', {text: results[i].path, class: 'path-link'})
                .data('gme-id', results[i].path)
                .on('click', this._onLinkClick)
            );

            if (results[i].relatedPaths.length > 0) {
                dl.append($('<dt>', {text: 'Related paths'}));
                for (j = 0; j < results[i].relatedPaths.length; j += 1) {
                    dl.append($('<dd>', {
                        text: results[i].relatedPaths[j],
                        class: 'path-link'
                    }).data('gme-id', results[i].relatedPaths[j]));
                }
            }

            resEl.append(dl);
            this._el.append(resEl);

            if (i === results.length -1 && this._dividerAtBottom) {
                this._el.append($('<div>', {class: 'meta-inconsistency-divider'}));
            }
        }
    };

    MetaInconsistencyResultWidget.prototype.destroy = function () {
        this._el.find('dd.path-link').off('click');
        this._el.find('i.close-result').off('click');

        this._el.empty();
    };

    return MetaInconsistencyResultWidget;
});