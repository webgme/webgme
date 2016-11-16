/**
 * @author kecso / https://github.com/kecso
 */

define(['js/Constants', 'js/RegistryKeys'], function (CONSTANTS, REGISTRY_KEYS) {
    'use strict';
    var line_svg_directory = {},
        arrowExtra = '-xwide-xlong';

    line_svg_directory[REGISTRY_KEYS.LINE_STYLE] = {};
    line_svg_directory[REGISTRY_KEYS.LINE_STYLE][CONSTANTS.LINE_STYLE.PATTERNS.SOLID] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs>' +
        '<path fill="none" stroke="#000000" d="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_STYLE][CONSTANTS.LINE_STYLE.PATTERNS.DASH] =
        '<svg id="RaphaelSVG_18" height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs>' +
        '<path fill="none" stroke="#000000" d="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="3,1" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_STYLE][CONSTANTS.LINE_STYLE.PATTERNS.LONGDASH] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs>' +
        '<path fill="none" stroke="#000000" d="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="4,3" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_STYLE][CONSTANTS.LINE_STYLE.PATTERNS.DOT] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs>' +
        '<path fill="none" stroke="#000000" d="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="1,1" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_STYLE][CONSTANTS.LINE_STYLE.PATTERNS.DASH_DOT] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs>' +
        '<path fill="none" stroke="#000000" d="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="3,1,1,1" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_STYLE][CONSTANTS.LINE_STYLE.PATTERNS.DASH_DOT_DOT] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs>' +
        '<path fill="none" stroke="#000000" d="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="3,1,1,1,1,1" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';

    line_svg_directory[REGISTRY_KEYS.LINE_END_ARROW] = {};
    line_svg_directory[REGISTRY_KEYS.LINE_END_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.NONE] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs>' +
        '<path fill="none" stroke="#000000" d="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_END_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.DIAMOND + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<path stroke-linecap="round" d="M2.5,0 5,2.5 2.5,5 0,2.5z" id="raphael-marker-diamond-RaphaelSVG_4_0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-enddiamond-RaphaelSVG_4-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-diamond-RaphaelSVG_4_0" ' +
        'transform="rotate(180 4.5 4.5) scale(1.8,1.8)" stroke-width="0.5556" fill="#000000" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs><path fill="none" ' +
        'stroke="#000000" d="M5,10.5C5,10.5,30.05913734436035,10.5,40.508601842448115,10.5" ' +
        'marker-end="url(#raphael-marker-enddiamond-RaphaelSVG_4-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_END_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.BLOCK + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;"><' +
        'desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"><path stroke-linecap="round" ' +
        'd="M5,0 0,2.5 5,5z" id="raphael-marker-block-RaphaelSVG_6_0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-endblock-RaphaelSVG_6-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-block-RaphaelSVG_6_0" ' +
        'transform="rotate(180 4.5 4.5) scale(1.8,1.8)" stroke-width="0.5556" fill="#000000" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs><path fill="none" ' +
        'stroke="#000000" d="M5,10.5C5,10.5,30.05913734436035,10.5,40.508601842448115,10.5" ' +
        'marker-end="url(#raphael-marker-endblock-RaphaelSVG_6-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_END_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.CLASSIC + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<path stroke-linecap="round" d="M5,0 0,2.5 5,5 3.5,3 3.5,2z" id="raphael-marker-classic-RaphaelSVG_8_0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-endclassic-RaphaelSVG_8-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-classic-RaphaelSVG_8_0" ' +
        'transform="rotate(180 4.5 4.5) scale(1.8,1.8)" stroke-width="0.5556" fill="#000000" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs><path fill="none" ' +
        'stroke="#000000" d="M5,10.5C5,10.5,30.05913734436035,10.5,40.508601842448115,10.5" ' +
        'marker-end="url(#raphael-marker-endclassic-RaphaelSVG_8-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_END_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.OPEN + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"><path stroke-linecap="round" ' +
        'd="M4.5,0.5 0.5,2.5 3.5,2.5 0.5,2.5 4.5,4.5" id="raphael-marker-open-RaphaelSVG_10_0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-endopen-RaphaelSVG_10-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        'use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-open-RaphaelSVG_10_0" ' +
        'transform="rotate(180 4.5 4.5) scale(1.8,1.8)" stroke-width="0.5556" fill="none" stroke="#000000" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs><path fill="none" ' +
        'stroke="#000000" d="M5,10.5C5,10.5,30.05913734436035,10.5,40.508601842448115,10.5" ' +
        'marker-end="url(#raphael-marker-endopen-RaphaelSVG_10-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_END_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.OVAL + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"><path stroke-linecap="round" ' +
        'd="M2.5,0A2.5,2.5,0,0,1,2.5,5 2.5,2.5,0,0,1,2.5,0z" id="raphael-marker-oval-RaphaelSVG_12_0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-endoval-RaphaelSVG_12-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-oval-RaphaelSVG_12_0" ' +
        'transform="rotate(180 4.5 4.5) scale(1.8,1.8)" stroke-width="0.5556" fill="#000000" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs><path fill="none" ' +
        'stroke="#000000" d="M5,10.5C5,10.5,30.05913734436035,10.5,40.508601842448115,10.5" ' +
        'marker-end="url(#raphael-marker-endoval-RaphaelSVG_12-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_END_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.DIAMOND2 + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<path stroke-linecap="round" d="M2.5,1 5,2.5 2.5,4 0,2.5z" id="raphael-marker-diamond2-RaphaelSVG_14_0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-enddiamond2-RaphaelSVG_14-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-diamond2-RaphaelSVG_14_0" ' +
        'transform="rotate(180 4.5 4.5) scale(1.8,1.8)" stroke-width="0.5556" fill="#000000" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs><path fill="none" ' +
        'stroke="#000000" d="M5,10.5C5,10.5,30.05913734436035,10.5,40.508601842448115,10.5" ' +
        'marker-end="url(#raphael-marker-enddiamond2-RaphaelSVG_14-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_END_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.INHERITANCE + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"><path stroke-linecap="round" ' +
        'd="M5,0 0,2.5 5,5z" id="raphael-marker-inheritance-RaphaelSVG_16_0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<path stroke-linecap="round" d="M4.7,0.4 0.5,2.5 4.7,4.6 z" id="raphael-marker-inheritance-RaphaelSVG_16_1" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-endinheritance-RaphaelSVG_16-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-inheritance-RaphaelSVG_16_0" ' +
        'transform="rotate(180 4.5 4.5) scale(1.8,1.8)" stroke-width="0.5556" fill="#000000" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use>' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-inheritance-RaphaelSVG_16_1" ' +
        'transform="rotate(180 4.5 4.5) scale(1.8,1.8)" stroke-width="0.5556" fill="#FFFFFF" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs>' +
        '<path fill="none" stroke="#000000" d="M5,10.5C5,10.5,30.05913734436035,10.5,40.508601842448115,10.5" ' +
        'marker-end="url(#raphael-marker-endinheritance-RaphaelSVG_16-99#000000)" ' +
        'stroke-width="1" stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';

    line_svg_directory[REGISTRY_KEYS.LINE_START_ARROW] = {};
    line_svg_directory[REGISTRY_KEYS.LINE_START_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.NONE] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs>' +
        '<path fill="none" stroke="#000000" d="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_START_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.DIAMOND + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<path stroke-linecap="round" d="M2.5,0 5,2.5 2.5,5 0,2.5z" id="raphael-marker-diamond-RaphaelSVG_3_0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-startdiamond-RaphaelSVG_3-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-diamond-RaphaelSVG_3_0" ' +
        'transform="scale(1.8,1.8)" stroke-width="0.5556" fill="#000000" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs>' +
        '<path fill="none" stroke="#000000" d="M9.491398157551885,10.5C19.94086265563965,10.5,45,10.5,45,10.5" ' +
        'marker-start="url(#raphael-marker-startdiamond-RaphaelSVG_3-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_START_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.BLOCK + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<path stroke-linecap="round" d="M5,0 0,2.5 5,5z" id="raphael-marker-block-RaphaelSVG_5_0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-startblock-RaphaelSVG_5-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-block-RaphaelSVG_5_0" ' +
        'transform="scale(1.8,1.8)" stroke-width="0.5556" fill="#000000" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs>' +
        '<path fill="none" stroke="#000000" d="M9.491398157551885,10.5C19.94086265563965,10.5,45,10.5,45,10.5" ' +
        'marker-start="url(#raphael-marker-startblock-RaphaelSVG_5-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_START_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.CLASSIC + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<path stroke-linecap="round" d="M5,0 0,2.5 5,5 3.5,3 3.5,2z" id="raphael-marker-classic-RaphaelSVG_7_0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-startclassic-RaphaelSVG_7-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-classic-RaphaelSVG_7_0" ' +
        'transform="scale(1.8,1.8)" stroke-width="0.5556" fill="#000000" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs>' +
        '<path fill="none" stroke="#000000" d="M9.491398157551885,10.5C19.94086265563965,10.5,45,10.5,45,10.5" ' +
        'marker-start="url(#raphael-marker-startclassic-RaphaelSVG_7-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_START_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.OPEN + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<path stroke-linecap="round" d="M4.5,0.5 0.5,2.5 3.5,2.5 0.5,2.5 4.5,4.5" ' +
        'id="raphael-marker-open-RaphaelSVG_9_0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-startopen-RaphaelSVG_9-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-open-RaphaelSVG_9_0" ' +
        'transform="scale(1.8,1.8)" stroke-width="0.5556" fill="none" stroke="#000000" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs>' +
        '<path fill="none" stroke="#000000" d="M9.491398157551885,10.5C19.94086265563965,10.5,45,10.5,45,10.5" ' +
        'marker-start="url(#raphael-marker-startopen-RaphaelSVG_9-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_START_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.OVAL + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<path stroke-linecap="round" d="M2.5,0A2.5,2.5,0,0,1,2.5,5 2.5,2.5,0,0,1,2.5,0z" ' +
        'id="raphael-marker-oval-RaphaelSVG_11_0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-startoval-RaphaelSVG_11-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-oval-RaphaelSVG_11_0" ' +
        'transform="scale(1.8,1.8)" stroke-width="0.5556" fill="#000000" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs>' +
        '<path fill="none" stroke="#000000" d="M9.491398157551885,10.5C19.94086265563965,10.5,45,10.5,45,10.5" ' +
        'marker-start="url(#raphael-marker-startoval-RaphaelSVG_11-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_START_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.DIAMOND2 + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<path stroke-linecap="round" d="M2.5,1 5,2.5 2.5,4 0,2.5z" ' +
        'id="raphael-marker-diamond2-RaphaelSVG_13_0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-startdiamond2-RaphaelSVG_13-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-diamond2-RaphaelSVG_13_0" ' +
        'transform="scale(1.8,1.8)" stroke-width="0.5556" fill="#000000" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs>' +
        '<path fill="none" stroke="#000000" d="M9.491398157551885,10.5C19.94086265563965,10.5,45,10.5,45,10.5" ' +
        'marker-start="url(#raphael-marker-startdiamond2-RaphaelSVG_13-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_START_ARROW][CONSTANTS.LINE_STYLE.LINE_ARROWS.INHERITANCE + arrowExtra] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<path stroke-linecap="round" d="M5,0 0,2.5 5,5z" id="raphael-marker-inheritance-RaphaelSVG_15_0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<path stroke-linecap="round" d="M4.7,0.4 0.5,2.5 4.7,4.6 z" id="raphael-marker-inheritance-RaphaelSVG_15_1" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<marker id="raphael-marker-startinheritance-RaphaelSVG_15-99#000000" markerHeight="9" markerWidth="9" ' +
        'orient="auto" refX="4.5" refY="4.5" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-inheritance-RaphaelSVG_15_0" ' +
        'transform="scale(1.8,1.8)" stroke-width="0.5556" fill="#000000" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use>' +
        '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#raphael-marker-inheritance-RaphaelSVG_15_1" ' +
        'transform="scale(1.8,1.8)" stroke-width="0.5556" fill="#FFFFFF" stroke="none" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></use></marker></defs>' +
        '<path fill="none" stroke="#000000" d="M9.491398157551885,10.5C19.94086265563965,10.5,45,10.5,45,10.5" ' +
        'marker-start="url(#raphael-marker-startinheritance-RaphaelSVG_15-99#000000)" stroke-width="1" ' +
        'stroke-dasharray="0" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';

    line_svg_directory[REGISTRY_KEYS.LINE_WIDTH] = {};
    line_svg_directory[REGISTRY_KEYS.LINE_WIDTH][1] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs><path fill="none" stroke="#000000" ' +
        'd="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_WIDTH][2] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs><path fill="none" stroke="#000000" ' +
        'd="M5,10.5L45,10.5" stroke-width="2" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_WIDTH][3] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs><path fill="none" stroke="#000000" ' +
        'd="M5,10.5L45,10.5" stroke-width="3" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_WIDTH][4] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs><path fill="none" stroke="#000000" ' +
        'd="M5,10.5L45,10.5" stroke-width="4" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_WIDTH][5] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs><path fill="none" stroke="#000000" ' +
        'd="M5,10.5L45,10.5" stroke-width="5" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_WIDTH][6] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs><path fill="none" stroke="#000000" ' +
        'd="M5,10.5L45,10.5" stroke-width="6" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_WIDTH][7] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs><path fill="none" stroke="#000000" ' +
        'd="M5,10.5L45,10.5" stroke-width="7" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_WIDTH][8] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs><path fill="none" stroke="#000000" ' +
        'd="M5,10.5L45,10.5" stroke-width="8" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';

    line_svg_directory[REGISTRY_KEYS.LINE_LABEL_PLACEMENT] = {};
    line_svg_directory[REGISTRY_KEYS.LINE_LABEL_PLACEMENT][CONSTANTS.LINE_STYLE.LABEL_PLACEMENTS.MIDDLE] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs>' +
        '<path fill="none" stroke="#000000" d="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<text x="25" y="9" text-anchor="middle" font="10px &quot;Arial&quot;" stroke="none" fill="#000000" ' +
        'font-size="8px" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0); text-anchor: middle; ' +
        'font-style: normal; font-variant: normal; font-weight: normal; font-stretch: normal; font-size: 8px; ' +
        'line-height: normal; font-family: Arial;"><tspan dy="9" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">$</tspan></text></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_LABEL_PLACEMENT][CONSTANTS.LINE_STYLE.LABEL_PLACEMENTS.SRC] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs>' +
        '<path fill="none" stroke="#000000" d="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path><text x="7" y="9" text-anchor="middle" ' +
        'font="10px &quot;Arial&quot;" stroke="none" fill="#000000" font-size="8px" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0); text-anchor: middle; font-style: normal; ' +
        'font-variant: normal; font-weight: normal; font-stretch: normal; font-size: 8px; line-height: normal; ' +
        'font-family: Arial;"><tspan dy="9" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">$</tspan></text><' +
        '/svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_LABEL_PLACEMENT][CONSTANTS.LINE_STYLE.LABEL_PLACEMENTS.DST] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs><path fill="none" ' +
        'stroke="#000000" d="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path>' +
        '<text x="43" y="9" text-anchor="middle" font="10px &quot;Arial&quot;" stroke="none" fill="#000000" ' +
        'font-size="8px" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0); text-anchor: middle; ' +
        'font-style: normal; font-variant: normal; font-weight: normal; font-stretch: normal; font-size: 8px; ' +
        'line-height: normal; font-family: Arial;"><tspan dy="9" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">$</tspan></text></svg>';

    line_svg_directory[REGISTRY_KEYS.LINE_TYPE] = {};
    line_svg_directory[REGISTRY_KEYS.LINE_TYPE][CONSTANTS.LINE_STYLE.TYPES.NONE] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs><path fill="none" stroke="#000000" ' +
        'd="M5,10.5L45,10.5" stroke-width="1" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';
    line_svg_directory[REGISTRY_KEYS.LINE_TYPE][CONSTANTS.LINE_STYLE.TYPES.BEZIER] =
        '<svg height="20" version="1.1" width="50" xmlns="http://www.w3.org/2000/svg" ' +
        'style="overflow: hidden; position: relative;">' +
        '<desc style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">Created with Raphaël 2.1.2</desc>' +
        '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></defs><path fill="none" stroke="#000000" ' +
        'd="M5,10.5C15,-9.5,40,30.5,45,10.5" stroke-width="1" stroke-dasharray="0" ' +
        'style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);"></path></svg>';

    return line_svg_directory;
});