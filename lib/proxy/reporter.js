'use strict';

var uuid = require('node-uuid'),
    MAXLENGTH = 2000;

class Report {

    constructor (id, req) {
        this._id = id;
        this._req = req;
        this._res = null;
    }

    finish(res) {
        this._res = res;
    }

    toJSON() {
        return {
            hostname : this._req.hostname,
            url : this._req.url,
            method : this._req.method,
            statusCode : this._res ? this._res.statusCode : null
        }
    }

}

class ProxyReporter {

    constructor() {
        this._reports = [];
    }

    create (req) {
        var report = new Report(uuid.v4(), req);
        this._reports.push(report);
        return report;
    }

    * [Symbol.iterator] () {
        for (r of this._reports) {
            yield r;
        }
    }

}

module.exports = ProxyReporter;