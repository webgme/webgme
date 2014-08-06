/*globals define, console, window, angular*/

define( [], function () {
    "use strict";


    var DeleteProjectController = function ( $scope, $modalInstance, gmeClient, projectData, postDelete ) {

        $scope.projectName = projectData.projectId;

        $scope.ok = function () {

                gmeClient.deleteProjectAsync(projectData.projectId, function (err) {
                    if (err) {
                        console.error(err);
                        return;
                    } else {

                        if (angular.isFunction(postDelete)) {
                            postDelete();
                        }

                    }
                });

            $modalInstance.close();
        };

        $scope.cancel = function () {
            $modalInstance.dismiss( 'cancel' );
        };
    };

    return DeleteProjectController;
} );
