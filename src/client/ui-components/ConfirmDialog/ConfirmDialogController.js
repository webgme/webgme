/*globals define, console, window, angular*/

define( [], function () {
    "use strict";


    var ConfirmDialogController = function (
        $scope, $modalInstance,
        dialogTitle, dialogContentTemplate, callbacks
        ) {

        $scope.dialogTitle = dialogTitle;
        $scope.dialogContentTemplate = dialogContentTemplate;

        $scope.ok = function () {

            $modalInstance.close();

            if ( callbacks && angular.isFunction(callbacks.onOk)) {
                callbacks.onOk();
            }

        };

        $scope.cancel = function () {
            $modalInstance.dismiss( 'cancel' );

            if ( callbacks && angular.isFunction(callbacks.onCancel)) {
                callbacks.onCancel();
            }

        };
    };

    return ConfirmDialogController;
} );
