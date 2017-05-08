'use strict';

const ProxyServer = require('../proxy'),
  fs = require('fs-extra'),
  express = require('express'),
  urlrewrite = require('express-urlrewrite'),
  path = require('path'),
  logger = require('log4js').getLogger('WebServer'),
  browserify = require('browserify-middleware'),
  directory = require('../proxy/directory'),
  server = express();

require('express-ws')(server);

server.get('/', (req, res) => {
  res.redirect('/ui/');
});

server.use(require('body-parser').json());
server.use(urlrewrite('/ui/*', '/modules/index.html'));

server.use('/modules', browserify(path.join(__dirname, './modules')));
server.use('/modules', express.static(path.join(__dirname, './modules')));
server.use('/modules/admin-lte', express.static(path.join(__dirname, '../../node_modules/admin-lte')));
server.use('/modules/font-awesome', express.static(path.join(__dirname, '../../node_modules/font-awesome')));
server.use('/modules/toastr', express.static(path.join(__dirname, '../../node_modules/toastr/build')));

server.use('/funnyp.crt', express.static(path.join(directory, './certs/rootCA.crt')));

server.get('/service/server/list', (req, res) => {
  res.json(Array.from(ProxyServer));
});

server.post('/service/server', (req, res) => {
  ProxyServer.create(req.body)
    .then((server) => {
      return server.start()
        .then(() => res.json(server))
        .catch(() => res.json(server));
    })
    .catch(e => res.status(500).send(e.message));
});

server.get('/service/:id/config', (req, res) => {
  ProxyServer.get(req.params['id'])
    .then((server) => {
      if (!server) {
        res.sendStatus(404);
        return;
      }
      try {
        res.json(server.config);
      } catch (e) {
        res.status(500).send(e.message);
      }
    });
});

server.put('/service/:id/config', (req, res) => {
  let config = req.body;
  ProxyServer.get(req.params['id'])
    .then((server) => {
      if (!server) {
        res.sendStatus(404);
        return;
      }
      try {
        ProxyServer.save(server, config);
        res.json(config);
      } catch (e) {
        res.status(500).send(e.message);
      }
    });
});

server.delete('/service/:id', (req, res) => {
  ProxyServer.get(req.params['id'])
    .then((server) => {
      if (!server) {
        res.sendStatus(404);
        return;
      }
      try {
        res.json(ProxyServer.delete(server));
      } catch (e) {
        res.status(500).send(e.message);
      }
    });
});

server.post('/service/:id/restart', (req, res) => {
  ProxyServer.get(req.params['id'])
    .then((server) => {
      if (!server) {
        res.sendStatus(404);
        return;
      }
      server.stop()
        .then(function () {
          return server.start();
        })
        .then(function () {
          res.json(server);
        })
        .catch(function (e) {
          res.status(500).send(e.message);
        });
    });
});

server.ws('/service/report', function (ws) {

  var reporter = null,
    current;

  ws.on('message', (id) => {
    unbind();
    if (!id) {
      current == null;
      return;
    }
    ;
    ProxyServer.get(id)
      .then((proxy) => {
        if (proxy == null) {
          logger.warn(`Proxy ${id} not exists`);
          return;
        }
        if (current !== proxy) {
          prefetch(proxy);
        }
        bind(proxy);
      });
  });

  ws.on('close', unbind);

  function bind(proxy) {
    current = proxy;
    reporter = proxy.reporter;
    reporter
      .addListener('create', onCreate)
      .addListener('finish', onFinished)
      .addListener('expired', onExpired);
  }

  function unbind() {
    if (!reporter) {
      return;
    }
    reporter
      .removeListener('create', onCreate)
      .removeListener('finish', onFinished)
      .removeListener('expired', onExpired);
  }

  function prefetch(proxy) {
    let reports = proxy.reporter.getReports().slice(0, 128);
    for (let report of reports) {
      ws.send(JSON.stringify(report));
    }
  }

  function onCreate(report) {
    ws.send(JSON.stringify(report));
  }

  function onFinished(report) {
    ws.send(JSON.stringify(report));
  }

  function onExpired(report) {
    ws.send(JSON.stringify(report));
  }

});


server.get('/capture/request/:id', (req, res) => {
  let id = req.params.id,
    headerFile = path.join(directory, 'capture', id + '-req.json'),
    binFile = path.join(directory, 'capture', id + '-req.bin');
  fs.readJson(headerFile, (e, headers) => {
    if (e) {
      res.status(404)
        .set('Content-Type', 'text/plain')
        .end('Content was expired.');
      return;
    }
    for (let header in headers) {
      if (headers.hasOwnProperty(header))
        res.set(header, headers[header]);
    }
    if (fs.existsSync(binFile)) {
      fs.createReadStream(binFile).pipe(res);
    } else {
      res.end();
    }
  });
});

server.get('/capture/response/:id', (req, res) => {
  let id = req.params.id,
    headerFile = path.join(directory, 'capture', id + '-res.json'),
    binFile = path.join(directory, 'capture', id + '-res.bin');
  fs.readJson(headerFile, (e, headers) => {
    if (e) {
      res.status(404)
        .set('Content-Type', 'text/plain')
        .end('Content was expired.');
      return;
    }
    for (let header in headers) {
      if (headers.hasOwnProperty(header))
        res.set(header, headers[header]);
    }
    if (fs.existsSync(binFile)) {
      fs.createReadStream(binFile).pipe(res);
    } else {
      res.end();
    }
  });
});

module.exports = (port) => {
  if (port) {
    server.listen(port);
    logger.info(`Web console listening on port ${port}.`);
  }
  return server;
};