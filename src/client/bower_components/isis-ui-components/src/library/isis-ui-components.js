/*globals angular*/

require('./services/isisUIServices.js');

require('./hierarchicalMenu/hierarchicalMenu.js');
require('./contextmenu/contextmenu.js');
require('./dropdownNavigator/dropdownNavigator.js');
require('./treeNavigator/treeNavigator.js');
require('./itemList/itemList.js');
require('./taxonomyTerms/taxonomyTerms.js');

angular.module('isis.ui.components', [
    'isis.ui.components.templates',
    'isis.ui.services',

    'isis.ui.hierarchicalMenu',
    'isis.ui.contextmenu',
    'isis.ui.dropdownNavigator',
    'isis.ui.treeNavigator',
    'isis.ui.itemList'

]);