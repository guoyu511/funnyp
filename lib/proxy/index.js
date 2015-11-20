/**
 * Created by guoyu on 15/11/8.
 */

'use strict';

var ProxyRules = require('./rules'),
    ProxyReporter = require('./reporter'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    net = require('net'),
    path = require('path'),
    fs = require('fs'),
    uuid = require('node-uuid'),
    home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'],
    funnyp = path.join(home, 'funnyp'),
    saveToDir = path.join(funnyp, 'servers'),
    logger = require('log4js').getLogger('ProxyServer'),
    servers = new Map();

if (!fs.existsSync(funnyp)) {
    fs.mkdirSync(funnyp);
}
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
    }

    start() {
        let port = this._config['port'];
        this.stop();
        this._createServer();
        return new Promise((resolve, reject) => {
            var rejection = (e) => {
                reject(e);
            };
            this._server.on('error', rejection);
            this._server.listen(port, () => {
                this._status = 'running';
                this._port = port;
                logger.info(`Proxy [${this.name}] listening on port ${port}`);
                this._server.removeListener('error', rejection);
                resolve(this);
            });
        });
    }

    stop() {
        if (!this._server) {
            return Promise.resolve(this);
        }
        this._server.close();
        this._port = null;
        logger.info(`Proxy [${this.name}] stopped`);
        this._status = 'sleeping';
        this._server = null;
        return Promise.resolve(this);
    }

    reload() {
        let json = JSON.parse(fs.readFileSync(this._file, 'utf-8'));
        this._config = json;
        this._rules = new ProxyRules(this, this._config['rules'] || []);
        return Promise.resolve(this);
    }

    get id() {
        return this._id;
    }

    get name() {
        return this._config['name'];
    }

    get port() {
        return this._port;
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

    set config(config) {
        this._config = config;
    }

    * [Symbol.iterator] () {
        for (let rule of this._rules) {
            yield rule;
        }
    }

    toJSON() {
        return {
            "id" : this.id,
            "name" : this.name,
            "port" : this.port,
            "status" : this.status
        }
    }

    _createServer() {
        this._server = http.createServer((req, res) =>
            this._handleRequest(req, res));

        this._server.on('connect', (req, socket, head) => {
            let opt = url.parse('http://' + req.url),
                connection;
            opt.port = opt.port || 80;
            connection = net.connect(
                opt.port === 80 ? 443 : opt.port, opt.hostname,
                () => {
                    socket.write('HTTP/' + req.httpVersion + ' 200 OK\r\n\r\n');
                    socket.write(head);
                    connection.pipe(socket);
                    socket.pipe(connection);
                });
            connection.on('error', (e) => socket.emit('error', e));
        });
    }

    _handleRequest(req, res) {
        let report = this._reporter.create(req);
        res.writeHead = ((target) => {
            return function () {
                let headers = typeof arguments[1] === 'object' ?
                    arguments[1] :
                    typeof arguments[2] === 'object' ?
                        arguments[2] : {};
                res._proxyResponseHeaders = headers;
                report.response(res);
                target.apply(res, arguments);
            };
        })(res.writeHead);
        res.on('error', (e) => {
            logger.warn(`Response write error ${e.message}`);
        });
        this._rules.dispatch(req, res);
    }

    static *[Symbol.iterator] () {
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
        server.stop();
        servers.delete(server.id);
        fs.unlinkSync(server._file);
        return Promise.resolve(server);
    }

    static load() {
        fs.readdirSync(saveToDir).forEach((serverDir) => {
            let id = serverDir,
                metaFile = path.resolve(saveToDir, serverDir, 'server.json'),
                server = new ProxyServer(id, metaFile);
            server.start();
            servers.set(id, server);
        });
    }

    static get(id) {
        return Promise.resolve(servers.get(id) || null);
    }

}

module.exports = ProxyServer;