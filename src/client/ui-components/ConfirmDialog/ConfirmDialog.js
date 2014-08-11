/*globals define, console, window, angular*/

define( [
  'angular',

  'text!./templates/ConfirmDialog.html'

], function ( ng, ConfirmDialogTemplate ) {
  "use strict";

  angular.module(
      'isis.ui.confirmDialog',
      [ 'ui.bootstrap' ]
    ).provider( '$confirmDialog', function () {

      var $confirmDialogProvider = {

        options: {
        },
        $get: ['$modal',
          function ( $modal ) {

            var $confirmDialog = {},
              ConfirmDialogController;

            ConfirmDialogController = function ( $scope, $modalInstance,
                                                 dialogTitle, dialogContentTemplate, onOk, onCancel, validator ) {

              $scope.dialogTitle = dialogTitle;
              $scope.dialogContentTemplate = dialogContentTemplate;

              $scope.ok = function () {

                if ( angular.isFunction(validator) ? validator($scope) : true ) {
                  $modalInstance.close();
                  if ( angular.isFunction( onOk ) ) {
                    onOk();
                  }
                }
              };

              $scope.cancel = function () {
                $modalInstance.dismiss( 'cancel' );
                if ( angular.isFunction( onCancel ) ) {
                  onCancel();
                }
              };
            };

            $confirmDialog.open = function ( options ) {

              var confirmDialogInstance = $modal.open( {
                template: ConfirmDialogTemplate,
                size: options.size,
                controller: ConfirmDialogController,
                scope: options.scope,
                resolve: {
                  dialogTitle: function() { return options.dialogTitle; },
                  dialogContentTemplate: function() {  return options.dialogContentTemplate; },
                  onOk: function() { return options.onOk; },
                  onCancel: function() { return options.onCancel; },
                  validator: function() { return options.validator; }
                }

              });

              console.log(options.scope);

              return confirmDialogInstance;

            };

            return $confirmDialog;

          }]
      };

      return $confirmDialogProvider;

    } );
} );
