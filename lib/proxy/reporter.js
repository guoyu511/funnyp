'use strict';

var uuid = require('node-uuid'),
    EventEmitter = require('events').EventEmitter,
    url = require('url'),
    MAXLENGTH = 100;

class Report {

    constructor (id, req, reporter) {
        this._id = id;
        this._req = req;
        this._res = null;
        this._reporter = reporter;
        this._ts = Date.now();
    }

    finish(res) {
        this._res = res;
        this._latency = Date.now() - this._ts;
        this._reporter.emit('finish', this);
    }

    error(code, message) {
        this.statusCode = code;
        this.statusMessage = message;
    }

    toJSON() {
        var token = url.parse(this._req.url);
        return {
            id : this._id,
            url : this._req.url,
            hostname : token.hostname,
            path : token.path,
            method : this._req.method,
            responseHeaders : this._res ? this._res._headers : null,
            requestHeaders : this._req.headers,
            statusCode : this._res ? this._res.statusCode : null,
            statusMessage : this._res ? this._res.statusMessage : null,
            latency : this._latency ? this._latency : null
        }
    }

}

class ProxyReporter extends EventEmitter {

    constructor() {
        super();
        this._reports = [];
    }

    create (req) {
        let report = new Report(uuid.v4(), req, this);
        this._reports.push(report);
        if (this._reports.length > MAXLENGTH) {
            this._reports.shift();
        }
        this.emit('create', report);
        return report;
    }

    * [Symbol.iterator] () {
        for (let r of this._reports) {
            yield r;
        }
    }

}

module.exports = ProxyReporter;