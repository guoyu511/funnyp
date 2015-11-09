/**
 * Created by guoyu on 15/11/8.
 */
'use strict';

var ProxyServers = require('./proxy'),
    ProxyRules = require('./proxy/rules');

module.exports = function () {

    ProxyRules.registerMatcher('regexp', require('./proxy/matcher/regexp'));

    ProxyRules.registerHandler('file', require('./proxy/handler/file'));
    ProxyRules.registerHandler("direct", require('./proxy/handler/direct'));

    ProxyServers.load();

    for (let server of ProxyServers) {
        server.start();
    }

};