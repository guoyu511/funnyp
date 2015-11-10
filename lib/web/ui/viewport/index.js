'use strict';


module.exports = function (angular, window) {

    function ViewportCtrl() {

    }

    return angular.module('uiViewport', [])
        .controller('viewportCtrl', ViewportCtrl);

};