# Funny Proxy

[![NPM version][npm-image]][npm-url]
[![node version][node-image]][node-url]

[npm-image]: https://img.shields.io/npm/v/npm.svg
[npm-url]: https://npmjs.org/package/anyproxy
[node-image]: https://img.shields.io/badge/node->=4.0.0-brightgreen.svg
[node-url]: http://nodejs.org/download/

Funny Proxy (funnyp) is a http proxy tool for developers to setup their development / debug environment.

## Features

* Fully configurable for capture and modify http/https requests.
* Web UI for inspect requests in real-time.
* Zero-configuration installation.
* Works on Linux & MacOSx & Windows.

[![NPM](https://nodei.co/npm/funnyp.png?downloads=true&downloadRank=true)](https://nodei.co/npm/funnyp/)

## Getting Started

**NodeJS**

Download and install nodejs from [https://nodejs.org](https://nodejs.org)

**Install funnyp** (require sudo for install global)

    npm install -g funnyp

**Launch proxy server**

```
funnyp -p 18000
```