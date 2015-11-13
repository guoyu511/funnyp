'use strict';

var ProxyServer = require('../proxy'),
    express = require('express'),
    urlrewrite = require('express-urlrewrite'),
    path = require('path'),
    logger = require('log4js').getLogger('WebServer'),
    browserify = require('browserify-middleware'),
    server = express();

server.get('/', (req, res) => {
    res.redirect('/ui/');
});

server.use(urlrewrite('/ui/*', '/modules/index.html'));

server.use('/modules', browserify(path.join(__dirname, './modules')));
server.use('/modules', express.static(path.join(__dirname, './modules')));
server.use('/modules/admin-lte', express.static(path.join(__dirname, '../../node_modules/admin-lte')));
server.use('/modules/font-awesome', express.static(path.join(__dirname, '../../node_modules/font-awesome')));

server.get('/service/servers', (req, res) => {
    res.json(Array.from(ProxyServer));
});

server.post('/service/:id/start', (req, res) => {
    ProxyServer.get(req.params['id'])
        .then(function (server) {
            if (server) {
                try {
                    server.start();
                    res.json(server);
                } catch (e) {
                    res.status(500).send(e.message);
                }
            } else {
                res.sendStatus(404);
            }
        });
});

server.post('/service/:id/stop', (req, res) => {
    ProxyServer.get(req.params['id'])
        .then(function (server) {
            if (server) {
                try {
                    server.stop();
                    res.json(server);
                } catch (e) {
                    res.status(500).send(e.message);
                }
            } else {
                res.sendStatus(404);
            }
        });
});

module.exports = (port) => {
    server.listen(port);
    logger.info(`WebServer listening on port ${port}`);
    return server;
};