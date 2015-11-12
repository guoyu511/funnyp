'use strict';

var $ = window.jQuery = window.$ = require('jquery'),
    angular = window.angular = require('angular');

window.AdminLTEOptions = {
    'sidebarSlimScroll' : false,
    'sidebarPushMenu' : false,
    'sidebarExpandOnHover' : false,
    'enableBSToppltip' : false,
    'enableControlSidebar' : false,
    'enableBoxWidget' : false,
    'enableFastclick' : false
};

require('admin-lte/dist/js/app');
require('admin-lte/plugins/slimScroll/jquery.slimscroll');

angular.bootstrap(global['document'], [
    require('angular-route'),
    require('./viewport'),
    require('./console'),
    require('./server')
]);