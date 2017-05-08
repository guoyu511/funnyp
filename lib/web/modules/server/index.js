'use strict';

var _ = require('underscore'),
  moduleName = 'proxyServer',
  ws = null,
  MAXLENGTH = 1024,
  previewTypes = ['javascript', 'text', 'image', 'json', 'xml', 'x-www-form-urlencoded'];

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
      name: this.name,
      port: this.port,
      rules: []
    });
  };

  this.cancel = () => {
    $scope.cancel(null);
  };
}

function InspectorCtrl($http, servers, $routeParams, $scope, messenger, dialogs) {

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
      filter: this.filter
    }).then((newFilter) => {
      if (newFilter === null) {
        return;
      }
      this.filter = newFilter || '.*';
      window.sessionStorage.setItem('devproxy-filter-' + id, newFilter);
    });
  };

  $scope.$emit('viewport.full');
  $scope.$on('$destroy', () => {
      $scope.$emit('viewport.reset');
      $scope.$emit('msg.channel', '');
  });
  $scope.$emit('msg.channel', id);

  $scope.$on('msg.report', (evt, data) => {
    let report = JSON.parse(data),
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
  });

  this.checkPreview = (headers, types) => {
    if (!headers || !headers['content-type']) {
      return false;
    }
    let contentType = headers['content-type'] || '';
    return (types || previewTypes).some((type) => contentType.indexOf(type) >= 0);
  };

  this.requestAsText = () => {
    $http.get('/capture/request/' + this.selected.id)
      .then((res) => {
        this.requestPreview =
          typeof res.data == 'string' ? res.data :
            typeof res.data == 'object' ? JSON.stringify(res.data) : '';
      });
  };

  this.requestAsJson = () => {
    $http.get('/capture/request/' + this.selected.id)
      .then((res) => {
        this.requestPreview = JSON.stringify(res.data);
      });
  };

  this.responseAsText = () => {
    $http.get('/capture/response/' + this.selected.id)
      .then((res) => {
        this.responsePreview =
          typeof res.data == 'string' ? res.data :
            typeof res.data == 'object' ? JSON.stringify(res.data) : '';
      });
  };

  this.responseAsJson = () => {
    $http.get('/capture/response/' + this.selected.id)
      .then((res) => {
        this.responsePreview = JSON.stringify(res.data);
      });
  };

  this.isArray = (value) => {
    return Array.isArray(value);
  };

}

function SettingCtrl($routeParams, $location, servers, dialogs) {

  var id = $routeParams['id'];

  this.server = servers.getServer(id);

  this.config = this.server.config;

  this.config.httpsHosts = this.config.httpsHosts || [];

  this.addRule = () => {
    dialogs('modules/server/editor.html', {
      rule: {}
    }).then((rule) => {
      if (!rule) {
        return;
      }
      this.config.rules.push(rule);
    });
  };

  this.editRule = (rule) => {
    dialogs('modules/server/editor.html', {
      rule: rule
    });
  };

  this.deleteRule = (rule) => {
    if (!window.confirm('Are you sure to delete this rule ?')) {
      return;
    }
    this.config.rules.splice(this.config.rules.indexOf(rule), 1);
  };

  this.moveUpRule = (rule) => {
    let rules = this.config.rules,
      index = rules.indexOf(rule);
    rules[index] = rules[index - 1];
    rules[index - 1] = rule;
  };

  this.moveDownRule = (rule) => {
    let rules = this.config.rules,
      index = rules.indexOf(rule);
    rules[index] = rules[index + 1];
    rules[index + 1] = rule;
  };

  this.addHttpsHost = () => {
    dialogs('modules/server/host.html', {})
      .then((host) => {
        if (!host) {
          return;
        }
        this.config.httpsHosts.push(host);
      });
  };

  this.deleteHttpsHost = (host) => {
    this.config.httpsHosts.splice(this.config.httpsHosts.indexOf(host), 1);
  };

  this.remove = () => {
    this.server.remove()
        .then(() => {
          $location.path('/ui/server');
          $location.replace();
        });
  }

}

function RuleEditorCtrl($scope) {


  this.rule = Object.assign({}, $scope.rule);

  if (this.rule.type) {
    this.typeDisabled = true;
  }

  this.finish = () => {
    Object.assign($scope.rule, this.rule);
    $scope.finish($scope.rule);
  };
  this.cancel = () => {
    $scope.cancel(null);
  };

}

function HostEditorCtrl($scope) {

  this.finish = () => {
    $scope.finish({
      name: this.name,
      port: this.port
    });
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

function messengerFactory() {

}

angular.module(moduleName, ['ngSanitize'])
  .controller('RuleEditorCtrl', RuleEditorCtrl)
  .controller('HostEditorCtrl', HostEditorCtrl)
  .controller('FilterEditorCtrl', FilterEditorCtrl)
  .controller('ServerListCtrl', ServerListCtrl)
  .controller('InspectorCtrl', InspectorCtrl)
  .controller('SettingCtrl', SettingCtrl)
  .controller('ServerCreateCtrl', ServerCreateCtrl)
  .service('messenger', messengerFactory)
  .config(($routeProvider) => {
    $routeProvider
      .when('/ui/server', {
        templateUrl: '/modules/server/list.html'
      })
      .when('/ui/server/:id', {
        templateUrl: '/modules/server/inspector.html'
      })
      .otherwise({
        redirectTo: () => '/ui/server'
      });
  })
  .run(($location, $q, $rootScope) => {
    let channelId = '', ws;
    $rootScope.$on('msg.channel', (evt, id) => {
      channelId = id;
      ws.send(id);
    });
    (function initWS() {
      let pingInterval;
      ws = new WebSocket(
        'ws://' + $location.host() + ':' + $location.port() +
        '/service/report');
      ws.onopen = () => {
        pingInterval = setInterval(() => {
          ws.send(channelId);
        }, 1000);
      };
      ws.onclose = () => {
        clearInterval(pingInterval);
        setTimeout(() => initWS(), 3000);
      };
      ws.onmessage = (e) => {
        $rootScope.$broadcast('msg.report', e.data);
      }
    }());
  });

module.exports = moduleName;