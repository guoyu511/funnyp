'use strict';

var express = require('express'),
    ProxyServer = require('../proxy'),
    path = require('path'),
    server = express(),
    logger = require('log4js').getLogger('WebServer'),
    browserify = require('browserify-middleware');

server.use('/ui', browserify(path.join(__dirname, './ui')));
server.use('/ui', express.static(path.join(__dirname, './ui')));
server.use('/ui/admin-lte', express.static(path.join(__dirname, '../../node_modules/admin-lte')));

server.get('/', (req, res) => {
    res.redirect('/ui');
});

server.get('/service/servers', (req, res) => {
    res.json(Array.from(ProxyServer));
});

module.exports = (port) => {
    server.listen(port);
    logger.info(`WebServer listening on port ${port}`);
    return server;
};