'use strict';

var moduleName = 'proxyServer';

function ServerListCtrl(servers) {

    this.servers = servers;

}

function InspectorCtrl(servers, $routeParams, $scope) {

    var id = $routeParams['id'];

    this.server = servers.getServer(id);

    $scope.$emit('viewport.full');

    $scope.$on('$destroy', () => $scope.$emit('viewport.reset'));

}

function ServerModel($http) {

    var servers = [];

    class Server {

        constructor(json) {
            Object.assign(this, json);
            this._loading = false;
        }

        get isLoading() {
            return this._loading;
        }

        start() {
            this._loading = true;
            $http.post(`/service/${this.id}/start`, {})
                .then((res) => {
                    Object.assign(this, res.data);
                    this._loading = false;
                })
                .finally(() => this._loading = false);
        }

        stop() {
            this._loading = true;
            $http.post(`/service/${this.id}/stop`, {})
                .then((res) => {
                    Object.assign(this, res.data);
                    this._loading = false;
                })
                .finally(() => this._loading = false);
        }

    }

    $http.get('/service/servers')
        .success((res) => {
            res.forEach((data) => {
                if (servers[data.id]) {
                    Object.assign(servers[data.id], data);
                } else {
                    let server = new Server(data)
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

    return servers;

}

angular.module(moduleName, [])
    .service('servers', ServerModel)
    .controller('ServerListCtrl', ServerListCtrl)
    .controller('InspectorCtrl', InspectorCtrl)
    .config(($routeProvider) => {
        $routeProvider
            .when('/ui/server', {
                templateUrl : '/modules/server/list.html'
            })
            .when('/ui/server/:id', {
                templateUrl : '/modules/server/detail.html'
            })
            .otherwise({
                redirectTo: () => '/ui/server'
            });
    });

module.exports = moduleName;