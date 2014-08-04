/*globals define, console, window*/

define( [], function () {
    "use strict";


    var DeleteProjectController = function ( $scope, $modalInstance, gmeClient, projectData ) {

        var postDelete = function() {
            document.location.href = window.location.href.split('?')[0];
        };
        $scope.projectName = projectData.projectId;

        $scope.ok = function () {

                gmeClient.deleteProjectAsync(projectData.projectId, function (err) {
                    if (err) {
                        console.error(err);
                        return;
                    } else {
                        postDelete();
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
