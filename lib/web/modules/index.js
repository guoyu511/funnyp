'use strict';

var $ = window.jQuery = window.$ = require('jquery'),
    angular = window.angular = require('angular'),
    toastr = require('toastr');

window.AdminLTEOptions = {
    'sidebarSlimScroll' : false,
    'sidebarPushMenu' : false,
    'sidebarExpandOnHover' : false,
    'enableBSToppltip' : false,
    'enableControlSidebar' : false,
    'enableBoxWidget' : false,
    'enableFastclick' : false
};

toastr.options = {
    "positionClass": "toast-bottom-right"
};

require('admin-lte/dist/js/app');
require('admin-lte/bootstrap/js/bootstrap');
require('admin-lte/plugins/slimScroll/jquery.slimscroll');

angular.bootstrap(global['document'], [
    require('angular-route'),
    require('angular-sanitize'),
    require('./viewport'),
    require('./console'),
    require('./server')
]);