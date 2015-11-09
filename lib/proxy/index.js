/**
 * Created by guoyu on 15/11/8.
 */

'use strict';

var Proxy = require('http-proxy'),
    ProxyRules = require('./rules'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    net = require('net'),
    path = require('path'),
    fs = require('fs'),
    uuid = require('node-uuid'),
    saveToDir = path.resolve(__dirname, '../../servers'),
    servers = new Set();

if (!fs.existsSync(saveToDir)) {
    fs.mkdirSync(saveToDir);
}

class ProxyServer {

    constructor(file) {
        this._file = file;
        this.reload();
    }

    start() {
        let port = this._config['port'];
        this._server.listen(port);
        console.log(`Server [${this.name}] listening on port ${port}`);
        return Promise.resolve(this);
    }

    stop() {
        this._server.close();
        return Promise.resolve(this);
    }

    reload() {
        let json = JSON.parse(fs.readFileSync(this._file, 'utf-8'));
        if (this._server) {
            this._server.close();
        }
        this._config = json;
        this._rules = new ProxyRules(this, this._config['rules'] || []);
        this._createServer();
        return Promise.resolve(this);
    }

    get name() {
        return this._config['name'];
    }

    set name(name) {
        this._config['name'] = name;
    }

    get port() {
        return this._config['port'];
    }

    set name(port) {
        this._config['port'] = port;
    }

    _createServer() {
        this._proxy = Proxy.createProxyServer();
        this._server = http.createServer((req, res) =>
            this._handleRequest(req, res));

        this._server.on('upgrade', (req, socket, head) =>
            this._proxy.ws(req, socket, head));

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

        this._proxy.on('error', (e) => this._requestError(e));
        this._server.on('error', (e) => this._requestError(e));
    }

    _handleRequest(req, res) {
        this._rules.dispatch(req, res);
    }

    _requestError(e) {

    }

    static *[Symbol.iterator] () {
        for (let server of servers) {
            yield server;
        }
        return;
    }

    static create(config) {
        let id = uuid.v4(),
            file = path.resolve(saveToDir, id + '.json'),
            server;
        fs.writeFileSync(file, JSON.stringify(config));
        server = new this(file);
        servers.add(server);
        return Promise.resolve(server);
    }

    static save(server, config) {
        fs.writeFileSync(server._file, JSON.stringify(config));
        return Promise.resolve(server);
    }

    static reload(server) {
        return server.reload();
    }

    static delete(server) {
        server.stop();
        servers.delete(server);
        fs.unlinkSync(server._file);
        return Promise.resolve(server);
    }

    static load() {
        fs.readdirSync(saveToDir).forEach(function (file) {
            servers.add(new ProxyServer(path.resolve(saveToDir, file)));
        });
    }

}

module.exports = ProxyServer;