'use strict';

var moduleName = 'proxyViewport';

function ViewportCtrl($location, $rootScope) {

    this.$location = $location;

    $rootScope.$on('$viewContentLoaded', function () {
        $.AdminLTE.layout.fix();
    });

}

function wrapperDirective() {

    function link(scope, el) {

        var o = $.AdminLTE.options;

        $.AdminLTE.pushMenu.activate(o.sidebarToggleSelector);
        $.AdminLTE.boxWidget.activate();
        $.AdminLTE.tree('.sidebar');

        $(".navbar .menu").slimscroll({
            height: o.navbarMenuHeight,
            alwaysVisible: false,
            size: o.navbarMenuSlimscrollWidth
        }).css("width", "100%");

        $(document.body).addClass('fiixed');
    }

    return {
        link : link,
        restrict : 'C'
    }
}

angular.module(moduleName, [])
    .controller('ViewportCtrl', ViewportCtrl)
    .directive('wrapper', wrapperDirective)
    .config(($routeProvider, $locationProvider) => {
        $routeProvider
            .when('/ui/servers', {
                templateUrl : '/modules/server/list.html'
            })
            .when('/ui/console', {
                templateUrl : '/modules/console/console.html'
            })
            .otherwise({
                redirectTo: function() {
                    return '/ui/servers';
                }
            });
        $locationProvider.html5Mode(true);
    })
    .run(($route) => {
        setTimeout(function () {
            $route.reload();
        }, 50);
    });

module.exports = moduleName;