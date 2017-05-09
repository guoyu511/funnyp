'use strict';

const ProxyServer = require('../proxy'),
  fs = require('fs-extra'),
  express = require('express'),
  urlrewrite = require('express-urlrewrite'),
  path = require('path'),
  logger = require('log4js').getLogger('WebServer'),
  browserify = require('browserify-middleware'),
  babelify = require('babelify'),
  directory = require('../proxy/directory'),
  os = require('os'),
  web = express();

require('express-ws')(web);

web.get('/', (req, res) => {
  res.redirect('/ui/');
});

web.use(require('body-parser').json());
web.use(urlrewrite('/ui/*', '/modules/index.html'));

web.use('/modules', browserify(path.join(__dirname, './modules'), {
  cache : true,
  precompile : true,
  transform : [babelify.configure({
    presets: ['es2015']
  })],
  grep : /\.js$/
}));
web.use('/modules', express.static(path.join(__dirname, './modules')));
web.use('/modules/admin-lte', express.static(path.join(__dirname, '../../node_modules/admin-lte')));
web.use('/modules/font-awesome', express.static(path.join(__dirname, '../../node_modules/font-awesome')));
web.use('/modules/toastr', express.static(path.join(__dirname, '../../node_modules/toastr/build')));

web.use('/funnyp.crt', express.static(path.join(directory, './certs/rootCA.crt')));

web.get('/service/server/list', (req, res) => {
  res.json(Array.from(ProxyServer));
});

web.post('/service/server', (req, res) => {
  ProxyServer.create(req.body)
    .then((server) => {
      return server.start()
        .then(() => res.json(server))
        .catch(() => res.json(server));
    })
    .catch(e => res.status(500).send(e.message));
});

web.get('/service/:id/config', (req, res) => {
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

web.put('/service/:id/config', (req, res) => {
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

web.delete('/service/:id', (req, res) => {
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

web.post('/service/:id/restart', (req, res) => {
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

web.ws('/service/report', function (ws) {

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


web.get('/capture/request/:id', (req, res) => {
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

web.get('/capture/response/:id', (req, res) => {
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
  port = port || 8888;
  web.listen(port, () => {
    let interfaces = os.networkInterfaces();
    let addresses = [];
    for (let k in interfaces) {
      for (let k2 in interfaces[k]) {
        let address = interfaces[k][k2];
        if (!address.internal) {
          addresses.push(address.address);
        }
      }
    }
    ProxyServer.bypass(addresses, port);
    logger.info(`Web console listening on port ${port}.`);

  });
  return web;
};