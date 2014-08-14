/*globals define, console, window, angular*/

define( [
  'angular',
  '../simpleDialog',

  'text!./demo.html'

], function ( ng, ConfirmDialog, DemoTemplate ) {
  "use strict";


  var isValid,
    demoApp = angular.module( 'isis.ui.simpleDialog.demo', ['isis.ui.simpleDialog'] ),

    parameter = {
      value: 10,
      invalid: true
    };

  demoApp.controller( 'ConfirmDialogDemoController', function ( $scope, $simpleDialog ) {

    isValid = function ( $scope ) {

      var result = (Number(parameter.value) === 4);

      console.log( 'Validator was called' );
      console.log( 'Sum is: ' + parameter.value, result );
      parameter.invalid = !result;

      return result;

    };


    $scope.parameter = parameter;

    $scope.isValid = function () {
      isValid();
      if ( !$scope.$$phase ) {
        $scope.$apply();
      }
    };

    $scope.openDialog = function () {

      $simpleDialog.open( {
        dialogTitle: 'Are you sure?',
        dialogContentTemplate: 'confirm-content-template',
        onOk: function () {
          console.log( 'OK was picked' );
        },
        onCancel: function () {
          console.log( 'This was canceled' );
        },
        validator: isValid,
        size: 'lg', // can be sm or lg
        scope: $scope
      } );

    };


  } );

  demoApp.controller( 'ConfirmDialogDemoDataController', function ( $scope ) {

  } );
} );