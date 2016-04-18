define([
    // Loaded at src/client/js/start.js

    'jquery',
    'jquery-ui',
    'jquery-ui-iPad',
    'js/jquery.WebGME',
    'bootstrap',
    'underscore',
    'backbone',
    'js/WebGME',
    'js/util',
    'js/logger',
    'superagent',
    'q',

    'angular',
    'angular-ui-bootstrap',

    'isis-ui-components',
    'isis-ui-components-templates',

    //layout
    'js/Layouts/DefaultLayout/DefaultLayout',

    //panels from default layout
    'js/Panels/Header/HeaderPanel',
    'js/Panels/FooterControls/FooterControlsPanel',
    'js/Panels/ObjectBrowser/ObjectBrowserPanel',
    'js/Panels/Visualizer/VisualizerPanel',
    'js/Panels/PartBrowser/PartBrowserPanel',
    'js/Panels/PropertyEditor/PropertyEditorPanel',

    //panels from visualizers.json
    'js/Panels/MetaEditor/MetaEditorPanel',
    'js/Panels/ModelEditor/ModelEditorPanel',
    'js/Panels/SetEditor/SetEditorPanel',
    'js/Panels/Crosscut/CrosscutPanel',
    'js/Panels/GraphViz/GraphVizPanel',

    //decorators
    'decorators/CircleDecorator/CircleDecorator',
    'decorators/DefaultDecorator/DefaultDecorator',
    'decorators/DocumentDecorator/DocumentDecorator',
    'decorators/MetaDecorator/MetaDecorator',
    'decorators/ModelDecorator/ModelDecorator',
    'decorators/SVGDecorator/SVGDecorator'
], function () {

});