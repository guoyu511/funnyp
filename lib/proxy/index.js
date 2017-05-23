/**
 * Created by guoyu on 15/11/8.
 */

'use strict';

var ProxyRules = require('./rules'),
  ProxyReporter = require('./reporter'),
  Url = require('url'),
  http = require('http'),
  https = require('https'),
  tls = require('tls'),
  net = require('net'),
  path = require('path'),
  fs = require('fs'),
  uuid = require('uuid'),
  baseDir = require('./directory'),
  saveToDir = path.join(baseDir, 'servers'),
  logFactory = require('log4js'),
  cert = new require('node-easy-cert')({
    rootDirPath: path.join(baseDir, 'certs')
  }),
  servers = new Map(),
  bypass = [],
  certPromise;

logFactory.replaceConsole();

certPromise = new Promise((resolve, reject) => {
  cert.generateRootCA({
    commonName: 'FunnyProxy',
    overwrite: false
  }, (ignore) => {
    resolve();
  });
});

if (!fs.existsSync(saveToDir)) {
  fs.mkdirSync(saveToDir);
}

class ProxyServer {

  constructor(id, file) {
    this._id = id;
    this._file = file;
    this._status = 'sleeping';
    this._reporter = new ProxyReporter();
    this.reload();
    this._logger = logFactory.getLogger(`[${this.name}@${this.config.port}]`);
  }

  start() {
    return certPromise.then(() => {
      return this._createServer();
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (!this._server) {
        return resolve();
      }
      this._server.close();
      resolve();
    }).then(() => {
      this._status = 'sleeping';
      this.logger.info(`Server stopped`);
    });
  }

  reload() {
    let json = JSON.parse(fs.readFileSync(this._file, 'utf-8'));
    this._config = json;
    this._rules = new ProxyRules(this, this._config['rules'] || []);
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._config['name'];
  }

  get port() {
    return this._server && this._server.address() ? this._server.address().port : null;
  }

  get status() {
    return this._status;
  }

  get reporter() {
    return this._reporter;
  }

  get config() {
    return this._config;
  }

  get logger() {
    return this._logger;
  }

  set config(config) {
    this._config = config;
  }

  * [Symbol.iterator]() {
    for (let rule of this._rules) {
      yield rule;
    }
  }

  toJSON() {
    return {
      "id": this.id,
      "name": this.name,
      "port": this.port,
      "status": this.status
    }
  }

  _createServer() {
    return new Promise((resolve, reject) => {
      this._server = http.createServer(
        (req, res) => this._handleRequest(req, res));
      this._server.on('connect',
        (req, incoming, head) => this._handleConnect(req, incoming, head));
      this._server.listen(this._config.port, () => {
        this._status = 'running';
        this._server.removeListener('error', reject);
        this.logger.info(`Server listening on ${this.port}`);
        resolve();
      });
      this._server.on('error', reject);
    });
  }

  _handleRequest(req, res) {
    let url = Url.parse(req.url), report;
    if (this._bypass(url.hostname, url.port || '80')) {
      this._rules.direct(url, req, res);
      return;
    }
    report = this._reporter.create(url.href, req);
    this._rules.dispatch(url, req, res, report);
  }

  _handleSecureRequest(req, res) {
    let host = req.headers.host,
      url = Url.parse('https://' + host + req.url),
      report;
    report = this._reporter.create(url.href, req);
    this._rules.dispatch(url, req, res, report);
  }

  _handleConnect(req, downstream, head) {
    let opt = req.url.split(':'),
      host = opt[0],
      port = opt[1] || '80';
    if (this._bypass(host, port)) {
      this._forwardConnect(host, port, req, downstream, head, false);
      return;
    }
    if (!this._config.https || !this._checkHttpsHosts(host, port)) {
      this.logger.debug(`Tunnel to ${host}:${port}`);
      this._forwardConnect(host, port, req, downstream, head, true);
      return;
    }
    this._forwardSecureConnect(host, port, req, downstream, head);
  }

  _forwardConnect(host, port, req, downstream, head, useReport) {
    let report = useReport && this._reporter.createConnect(req, host, port);
    let upstream = net.connect(
      port, host,
      () => {
        downstream.write('HTTP/' + req.httpVersion + ' 200 OK\r\n\r\n');
        downstream.write(head);
        upstream.pipe(downstream);
        downstream.pipe(upstream);
        useReport && report.logFinish();
      });
    upstream.on('error', (e) => {
      downstream.emit('error', e);
      useReport && report.logError();
    });
  }

  _forwardSecureConnect(host, port, req, downstream, head) {
    this._getCertificate('internal_https')
      .then((secure) => {
        return https.createServer({
          key: secure.key,
          cert: secure.crt,
          SNICallback: (serverName, cb) =>
            this._resolveSecureContext(serverName, cb)
        });
      })
      .then((server) => {
        return new Promise((resolve, reject) => {
          server.listen(0, (e) => {
            if (e) return reject(e);
            downstream.on('close', () => {
              server.close();
            });
            this.logger.debug(`Decrypt ${req.url} on ${server.address().port}`);
            resolve(server);
          });
        });
      })
      .then((server) => {
        server.on('request', (req, res) => {
          let host = req.headers.host,
            url = Url.parse(`https://${host}${port == 443 ? '' : (':' + port)}${req.url}`),
            report = this._reporter.create(url.href, req);
          this._rules.dispatch(url, req, res, report);
        });
        this._forwardConnect('localhost', server.address().port, req, downstream, head, false);
      })
      .catch((e) => {
        downstream.emit('error', e);
      });
  }

  _getCertificate(host) {
    return new Promise((resolve, reject) => {
      cert.getCertificate(host, (e, key, crt) => {
        if (e) return reject(e);
        resolve({
          key: key,
          crt: crt
        });
      });
    });
  }

  _resolveSecureContext(serverName, cb) {
    this._getCertificate(serverName)
      .then((secure) => {
        cb(null, tls.createSecureContext({
          key: secure.key,
          cert: secure.crt
        }));
      })
      .catch(cb)
  }

  _checkHttpsHosts(hostname, port) {
    return (this._config.httpsHosts || [])
      .some((host) => {
        if (RegExp(host.name).test(hostname) && host.port == port) {
          return true;
        }
      })
  }

  _bypass(host, port) {
    return bypass.indexOf(host + ':' + port) >= 0;
  }

  static *[Symbol.iterator]() {
    for (let server of servers.values()) {
      yield server;
    }
    return;
  }

  static create(config) {
    let id = uuid.v4(),
      dir = path.resolve(saveToDir, id),
      file = path.resolve(dir, 'server.json'),
      server;
    fs.mkdirSync(dir);
    fs.writeFileSync(file, JSON.stringify(config));
    server = new this(id, file);
    servers.set(id, server);
    return Promise.resolve(server);
  }

  static save(server, config) {
    fs.writeFileSync(server._file, JSON.stringify(config));
    server.reload();
    return Promise.resolve(server);
  }

  static delete(server) {
    return server.stop()
      .then(() => {
        servers.delete(server.id);
        fs.unlinkSync(server._file);
        fs.rmdirSync(path.dirname(server._file));
        return server;
      });
  }

  static load() {
    fs.readdirSync(saveToDir).forEach((serverDir) => {
      let id = serverDir,
        metaFile = path.resolve(saveToDir, serverDir, 'server.json'),
        server;
      if (!fs.existsSync(metaFile)) {
        return;
      }
      server = new ProxyServer(id, metaFile);
      server.start();
      servers.set(id, server);
    });
  }

  static get(id) {
    return Promise.resolve(servers.get(id) || null);
  }

  static bypass(addresses, port) {
    addresses = addresses.concat(
      'localhost',
      '127.0.0.1'
    );
    bypass = addresses.map(address => address + ':' + port);
  }

}

module.exports = ProxyServer;