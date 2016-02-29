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

    //Commonly used dialogs and decorators

    // TODO: The following includes should ideally be built based on the gme-config
    // TODO: (decorators-, panel- and visualizer-paths)

    'js/Dialogs/Branches/BranchesDialog',
    'js/Dialogs/Commit/CommitDialog',
    'js/Dialogs/ConfirmDelete/ConfirmDeleteDialog',
    'js/Dialogs/ConstraintCheckResults/ConstraintCheckResultsDialog',
    'js/Dialogs/ConstraintCheckResults/ConstraintCheckResultsDialog',
    'js/Dialogs/CreateProject/CreateProjectDialog',
    'js/Dialogs/DecoratorSVGExplorer/DecoratorSVGExplorerDialog',
    'js/Dialogs/Import/ImportDialog',
    'js/Dialogs/Merge/MergeDialog',
    'js/Dialogs/PluginConfig/PluginConfigDialog',
    'js/Dialogs/PluginResults/PluginResultsDialog',
    'js/Dialogs/ProjectRepository/ProjectRepositoryDialog',
    'js/Dialogs/ProjectRights/ProjectRightsDialog',
    'js/Dialogs/Projects/ProjectsDialog',

    'js/Widgets/BranchSelector/BranchSelectorWidget',
    'js/Widgets/BranchStatus/BranchStatusWidget',
    'js/Widgets/Crosscut/CrosscutWidget',
    'js/Widgets/GraphViz/GraphVizWidget',
    'js/Widgets/KeyboardManager/KeyboardManagerWidget',
    'js/Widgets/MetaEditor/MetaEditorWidget',
    'js/Widgets/ModelEditor/ModelEditorWidget',
    'js/Widgets/NetworkStatus/NetworkStatusWidget',
    'js/Widgets/Notification/NotificationWidget',
    'js/Widgets/PartBrowser/PartBrowserWidget',
    'js/Widgets/ProjectRepository/ProjectRepositoryWidget',
    'js/Widgets/ProjectTitle/ProjectTitleWidget',
    'js/Widgets/SetEditor/SetEditorWidget',
    'js/Widgets/TreeBrowser/TreeBrowserWidget',
    'js/Widgets/UserProfile/UserProfileWidget',

    'decorators/CircleDecorator/CircleDecorator',
    'decorators/DefaultDecorator/DefaultDecorator',
    'decorators/DocumentDecorator/DocumentDecorator',
    'decorators/MetaDecorator/MetaDecorator',
    'decorators/ModelDecorator/ModelDecorator',
    'decorators/SVGDecorator/SVGDecorator'
], function () {

});