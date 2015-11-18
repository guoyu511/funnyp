'use strict';

var _ = require('underscore'),
    moduleName = 'proxyServer',
    ws = null,
    MAXLENGTH = 500;

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
            port : this.port
        });
    };

    this.cancel = () => {
        $scope.cancel(null);
    };
}

function InspectorCtrl(servers, $routeParams, $scope, dialogs) {

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
    console.log(this.filter);
    this.finish = () => {
        $scope.finish(this.filter);
    };
    this.cancel = () => {
        $scope.cancel(null);
    };
}

angular.module(moduleName, [])
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
    .run(function ($location) {
        ws = new WebSocket('ws://' + $location.host() + ':' + $location.port() +
            '/service/report');
    });

module.exports = moduleName;