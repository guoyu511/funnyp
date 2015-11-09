/**
 * Created by guoyu on 15/11/9.
 */

'use strict';

class DefaultHandler {

    constructor(server) {
        this._server = server;
    }

    process(req, res) {
        this._server._proxy.web(req, res, {
            target : {
                host : req.headers.host,
                port : req.headers.port || 80
            }
        });
    }

    toString() {
        return DefaultHandler.name;
    }

    static get name() {
        return 'Direct';
    }

}

module.exports = DefaultHandler;