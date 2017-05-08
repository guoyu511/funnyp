'use strict';

var moduleName = 'proxyViewport',
    toastr = require('toastr');


function ViewportCtrl($location, $rootScope, servers) {

    this.$location = $location;

    this.servers = servers;

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



function DialogService($rootScope, $injector, $q) {

    let $compile = $injector.get('$compile'),
        $templateRequest = $injector.get('$templateRequest');

    return (tmpl, prop)=> {
        let $scope = $rootScope.$new(),
            defer = $q.defer(),
            $el;
        Object.assign($scope, prop);
        $scope.finish = (data) => {
            $el.modal('hide').remove();
            $scope.$destroy();
            defer.resolve(data);
        };
        $scope.cancel = (data) => {
            $el.modal('hide').remove();
            $scope.$destroy();
            defer.resolve(data);
        };
        $templateRequest(tmpl)
            .then((tpl) => {
                $el = angular.element(tpl);
                $el.appendTo(document.body);
                $compile($el)($scope);
                $el.modal({
                    'show' : true,
                    'backdrop' : 'static',
                    'keyboard' : false
                });
            });
        return defer.promise;
    };

}


function ServerModel($http, $rootScope, $q) {

    var servers = [];

    class Server {

        constructor(json) {
            Object.assign(this, json);
            this._loading = false;
        }

        get isLoading() {
            return this._loading;
        }

        get config() {
            if (!this._config) {
                this._config = {};
                $http.get(`/service/${this.id}/config`)
                    .then((res) => {
                        Object.assign(this._config, res.data);
                        this._config.rules = this._config.rules || [];
                    });
            }
            return this._config;
        }

        set config(config) {
            this._config = config;
        }

        save() {
            if (!this._config) {
                throw new Error('Invalid state');
            }
            return $http.put(`/service/${this.id}/config`, this._config);
        }

        reload() {
            return this.save()
                .then(() => {
                    return $http.post(`/service/${this.id}/restart`, {})
                })
                .then((res) => {
                    Object.assign(this, res.data);
                    toastr.success('Server ' + this._config.name + ' listening on port ' + this.port);
                })
                .catch((res) => {
                    toastr.error(res.data);
                })
                .finally(() => this._loading = false);
        }

        remove() {
            if (!window.confirm('This operation cannot be undone. Would you like to proceed?')) {
                return $q.reject(null);
            }
            return $http.delete(`/service/${this.id}`)
                .then(() => {
                    servers.splice(servers.indexOf(this), 1);
                    toastr.success('Server ' + this._config.name + ' has bean deleted');
                })
                .catch((res) => {
                    toastr.error(res.data);
                });
        }

    }

    $http.get('/service/server/list')
        .success((res) => {
            res.forEach((data) => {
                if (servers[data.id]) {
                    Object.assign(servers[data.id], data);
                } else {
                    let server = new Server(data);
                    servers.push(server);
                    servers[data.id] = server;
                }
            });
        });

    servers.getServer = (id) => {
        var server = servers.find((server) => {
            return server['id'] === id
        });
        if (server) {
            return server;
        }
        server = new Server({
            id : id
        });
        servers.push(server);
        servers[id] = server;
        return server;
    };

    servers.create = (config) => {
        return $http.post(`/service/server`, config)
            .then((res) => {
                servers.push(new Server(res.data));
            });
    };

    return servers;

}

angular.module(moduleName, [])
    .controller('ViewportCtrl', ViewportCtrl)
    .service('servers', ServerModel)
    .directive('wrapper', wrapperDirective)
    .service('dialogs', DialogService)
    .config(($locationProvider) => {
        $locationProvider.html5Mode(true);
    })
    .run(($route) => $route);

module.exports = moduleName;