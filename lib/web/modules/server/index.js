'use strict';

var _ = require('underscore'),
    moduleName = 'proxyServer',
    ws = null,
    wsInitPromise = null,
    MAXLENGTH = 500,
    previewTypes = ['javascript', 'text', 'image', 'json', 'xml'];

function ServerListCtrl(servers, dialogs) {

    this.servers = servers;

    this.create = () => {
        dialogs('modules/server/create.html', {})
            .then((newConfig) => {
                if (newConfig === null) {
                    return;
                }
                servers.create(newConfig);
            });
    };

}

function ServerCreateCtrl($scope) {

    this.finish = () => {
        $scope.finish({
            name : this.name,
            port : this.port,
            rules : []
        });
    };

    this.cancel = () => {
        $scope.cancel(null);
    };
}

function InspectorCtrl($http, servers, $routeParams, $scope, dialogs) {

    var id = $routeParams['id'],
        bufferedDigest = _.throttle(() => $scope.$digest(), 100);

    this.filter = window.sessionStorage.getItem('devproxy-filter-' + id) || '.*';

    this.reports = [];

    this.server = servers.getServer(id);

    this.clear = () => {
        this.reports = [];
    };

    this.editFilter = () => {
        dialogs('modules/server/filter.html', {
            filter : this.filter
        }).then((newFilter) => {
            if (newFilter === null) {
                return;
            }
            this.filter = newFilter || '.*';
            window.sessionStorage.setItem('devproxy-filter-' + id, newFilter);
        });
    };

    $scope.$emit('viewport.full');
    $scope.$on('$destroy', () => $scope.$emit('viewport.reset'));

    wsInitPromise.then((ws) => {
        ws.send(id);
        ws.onmessage = (e) => {
            let report = JSON.parse(e.data),
                latency = report.latency,
                regexp = new RegExp(this.filter);
            if (!regexp.test(report.url)) {
                return;
            }
            report.latency = latency ?
                latency < 1000 ?
                    (latency + 'ms') :
                    (Math.floor(latency / 1000) + 's') :
                '';
            if (this.reports[report.id]) {
                Object.assign(this.reports[report.id], report);
                bufferedDigest();
                return;
            }
            this.reports.unshift(report);
            this.reports[report.id] = report;
            if (this.reports.length > MAXLENGTH) {
                this.reports.pop();
            }
            bufferedDigest();
        };
    });

    this.checkPreview = (types) => {
        if (!this.selected.responseHeaders ||
            !this.selected.responseHeaders['content-type']) {
            return false;
        }
        let contentType = this.selected.responseHeaders['content-type'] || '';
        return (types || previewTypes).some((type) => contentType.indexOf(type) >= 0);
    };

    this.previewAsText = () => {
        $http.get('/capture/response/' + this.selected.id)
          .then((res) => {
              this.capture = res.data;
          });
    };

    this.previewAsJson = () => {
        $http.get('/capture/response/' + this.selected.id)
          .then((res) => {
              this.capture = JSON.stringify(res.data);
          });
    };

}

function SettingCtrl($routeParams, servers, dialogs) {

    var id = $routeParams['id'];

    this.server = servers.getServer(id);

    this.config = this.server.config;

    this.addRule = () => {
        dialogs('modules/server/editor.html', {
            rule : {}
        }).then((rule) => {
            if (!rule) {
                return;
            }
            this.config.rules.push(rule);
        });
    };

    this.editRule = (rule) => {
        dialogs('modules/server/editor.html', {
            rule : rule
        });
    };

    this.deleteRule = (rule) => {
        if (!window.confirm('Are you sure to delete this rule ?')) {
            return;
        }
        this.config.rules.splice(this.config.rules.indexOf(rule), 1);
    };

    this.moveUp = (rule) => {
        let rules = this.config.rules,
            index = rules.indexOf(rule);
        rules[index] = rules[index - 1];
        rules[index - 1] = rule;
    };

    this.moveDown = (rule) => {
        let rules = this.config.rules,
            index = rules.indexOf(rule);
        rules[index] = rules[index + 1];
        rules[index + 1] = rule;
    };

}

function RuleEditorCtrl($scope) {


    this.rule = Object.assign({}, $scope.rule);

    if (this.rule.type) {
        this.typeDisabled= true;
    }

    this.finish = () => {
        Object.assign($scope.rule, this.rule);
        $scope.finish($scope.rule);
    };
    this.cancel = () => {
        $scope.cancel(null);
    };

}

function FilterEditorCtrl($scope) {
    this.filter = $scope.filter;
    this.finish = () => {
        $scope.finish(this.filter);
    };
    this.cancel = () => {
        $scope.cancel(null);
    };
}

angular.module(moduleName, ['ngSanitize'])
    .controller('RuleEditorCtrl', RuleEditorCtrl)
    .controller('FilterEditorCtrl', FilterEditorCtrl)
    .controller('ServerListCtrl', ServerListCtrl)
    .controller('InspectorCtrl', InspectorCtrl)
    .controller('SettingCtrl', SettingCtrl)
    .controller('ServerCreateCtrl', ServerCreateCtrl)
    .config(($routeProvider) => {
        $routeProvider
            .when('/ui/server', {
                templateUrl : '/modules/server/list.html'
            })
            .when('/ui/server/:id', {
                templateUrl : '/modules/server/inspector.html'
            })
            .otherwise({
                redirectTo: () => '/ui/server'
            });
    })
    .run(($location, $q) => {

        (function initWS() {
            let defer = $q.defer(),
                ws = new WebSocket(
                    'ws://' + $location.host() + ':' + $location.port() +
                    '/service/report'),
                pingInterval;
            ws.onopen = () => {
                pingInterval = setInterval(() => {
                    ws.send('');
                }, 1000);
                defer.resolve(ws);
            };
            ws.onclose = function () {
                clearInterval(pingInterval);
                setTimeout(initWS, 1000);
            };
            wsInitPromise = defer.promise;
        }());

    });

module.exports = moduleName;