'use strict';

var moduleName = 'proxyConsole';

function ConsoleCtrl() {


}

angular.module(moduleName, [])
    .controller('ConsoleCtrl', ConsoleCtrl)
    .config(function ($routeProvider) {
        $routeProvider
            .when('/ui/console', {
                templateUrl : '/modules/console/console.html'
            });
    })

module.exports = moduleName;