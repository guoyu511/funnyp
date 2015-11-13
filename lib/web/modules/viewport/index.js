'use strict';

var moduleName = 'proxyViewport';

function ViewportCtrl($location, $rootScope) {

    this.$location = $location;

    $rootScope.$on('$viewContentLoaded', () => $.AdminLTE.layout.fix());

}

function wrapperDirective() {

    function link(scope, el) {

        var o = $.AdminLTE.options,
            $body = $(document.body);

        $.AdminLTE.pushMenu.activate(o.sidebarToggleSelector);
        $.AdminLTE.boxWidget.activate();
        $.AdminLTE.tree('.sidebar');

        $(".navbar .menu").slimscroll({
            height: o.navbarMenuHeight,
            alwaysVisible: false,
            size: o.navbarMenuSlimscrollWidth
        }).css("width", "100%");

        $body.addClass('fixed');

        scope.$on('viewport.full', () => {
            $body.addClass('sidebar-expanded-on-hover');
            $.AdminLTE.pushMenu.collapse();
        });

        scope.$on('viewport.reset', () => {
            $.AdminLTE.pushMenu.expand();
        });

    }

    return {
        link : link,
        restrict : 'C'
    }
}

angular.module(moduleName, [])
    .controller('ViewportCtrl', ViewportCtrl)
    .directive('wrapper', wrapperDirective)
    .config(($locationProvider) => {
        $locationProvider.html5Mode(true);
    })
    .run(($route) => $route);

module.exports = moduleName;