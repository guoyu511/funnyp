# Funny Proxy

[![NPM Version](https://img.shields.io/npm/v/npm.svg?style=flat-square)](https://npmjs.org/package/funnyp) 
[![node Version](https://img.shields.io/badge/node->=4.0.0-brightgreen.svg?style=flat-square)](http://nodejs.org/download/) 


**funnyp** is a http proxy tool for developers to setup their environment for development, debugging or testing.

## Features

* Fully configurable for capture and modify http/https requests.
* Multiple proxy servers within single process.
* Web console for inspect requests in real-time.
* Zero-configuration installation.
* Works on Linux & MacOSx & Windows.

[![NPM](https://nodei.co/npm/funnyp.png?downloads=true&downloadRank=true)](https://nodei.co/npm/funnyp/)

## Getting Started

**Install NodeJS**

Download and install nodejs from [https://nodejs.org](https://nodejs.org)

**Install funnyp** (may required sudo for install as global command)

    npm install -g funnyp

**Launch proxy server**

```
funnyp -p 18000
```