/*globals define, console, window, angular*/

define( [
  'angular',

  'text!./templates/simpleDialog.html'

], function ( ng, ConfirmDialogTemplate ) {
  "use strict";

  angular.module(
      'isis.ui.simpleDialog',
      [ 'ui.bootstrap' ]
    ).provider( '$simpleDialog', function () {

      var $simpleDialogProvider = {

        options: {
        },
        $get: ['$modal',
          function ( $modal ) {

            var $simpleDialog = {},
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

            $simpleDialog.open = function ( options ) {

              var modalOptions = {
                template: ConfirmDialogTemplate,
                controller: ConfirmDialogController
              };

              modalOptions = angular.extend(modalOptions, options);

              modalOptions.resolve = angular.extend(modalOptions.resolve || {
                  dialogTitle: function() { return options.dialogTitle; },
                  dialogContentTemplate: function() {  return options.dialogContentTemplate; },
                  onOk: function() { return options.onOk; },
                  onCancel: function() { return options.onCancel; },
                  validator: function() { return options.validator; }
              });


              var simpleDialogInstance = $modal.open( modalOptions );


              return simpleDialogInstance;

            };

            return $simpleDialog;

          }]
      };

      return $simpleDialogProvider;

    } );
} );
