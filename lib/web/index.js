'use strict';

var ProxyServer = require('../proxy'),
    express = require('express'),
    urlrewrite = require('express-urlrewrite'),
    path = require('path'),
    logger = require('log4js').getLogger('WebServer'),
    browserify = require('browserify-middleware'),
    server = express();

require('express-ws')(server);

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
        .then((server) => {
            if (!server) {
                res.sendStatus(404);
                return;
            }
            try {
                server.start();
                res.json(server);
            } catch (e) {
                res.status(500).send(e.message);
            }
        });
});

server.post('/service/:id/stop', (req, res) => {
    ProxyServer.get(req.params['id'])
        .then((server) => {
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

server.ws('/service/report', (ws) => {
    var reporter = null;
    ws.on('message', (msg) => {
        unbind();
        ProxyServer.get(msg).then(bind);
    });

    ws.on('close', unbind);

    function bind(proxy) {
        reporter = proxy.reporter;
        for (let report of reporter) {
            ws.send(JSON.stringify(report));
        }
        reporter
            .on('create', onCreate)
            .addListener('finish', onFinished);
    }

    function unbind() {
        if (!reporter) {
            return;
        }
        reporter
            .removeListener('create', onCreate)
            .removeListener('finish', onFinished);
    }

    function onCreate(report) {
        ws.send(JSON.stringify(report));
    }

    function onFinished(report) {
        ws.send(JSON.stringify(report));
    }

});

module.exports = (port) => {
    server.listen(port);
    logger.info(`WebServer listening on port ${port}`);
    return server;
};