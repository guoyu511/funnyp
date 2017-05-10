# Funny Proxy

[![NPM Version](https://img.shields.io/npm/v/npm.svg?style=flat-square)](https://npmjs.org/package/funnyp) 
[![node Version](https://img.shields.io/badge/node->=4.0.0-brightgreen.svg?style=flat-square)](http://nodejs.org/download/) 


_funnyp_ is a web debugging proxy for developers. You can setup all your proxy servers with differenct group of  proxy rules within single instance.

**Features**

* Fully configurable for capture and modify http/https requests.
* Multiple proxy servers within single process.
* Web console for inspect requests in real-time.
* Zero-configuration installation.
* Works on any system environment.

## Getting Started

**Install NodeJS**

Download and install nodejs from [https://nodejs.org](https://nodejs.org)

**Install funnyp** 

_require sudo for install as global command_

    npm install -g funnyp

**Launch server**

```
funnyp -p 8888
```

Through this command, the web console will be started and listening on the specific port.
You can open the browser and visit `http://(your_ip_address):8888` to check if start successfully.

If there is any proxy server exists, they will also be started.

> Funnyp use WebSocket to inspect requests in real time, so you need a browser which supported it.

## Server Management

### Create Server

You can create a new proxy server by click the `Create Server` button on the dashboard page and input the server name and server port. Notice that the created proxy server should use **different** port with the web console.

After that the new server will be created. Now you can inspect the requests by click `inspect` button. By setting your client (web browser, mobile phone, etc) to using this address and port as http proxy, you will see the incoming requests on the request list table.

![requests](docs/images/request_table.png)

### Inspect Requests

You can inpsect each request go through the proxy server, including the following informations:

* url
* method
* status code & status message
* request headers
* request content (available for limited mime-types)
* response headers
* response content (available for limited mime-types)

![inspect request](docs/images/inspect_request.png)


### Proxy Rules

Each proxy server may contains several different type of proxy rules. You can configure your rules according to your needs by swith to `settings` tab and click `Add Rule` button.

Configured rules are orderd and chained. One request can match **at most** one rule. If there is a rule matched for request, then the matching process will break immediatly. 

**Direct Rule**

`Direct Rule` is the simplest proxy rule. It just pass requests to their requested resource directly without any modification. It is also the default behavior when there is no rules matched for request.

//TODO

**Redirect**

//TODO



**Revert Proxy**

//TODO



### Decrypt HTTPS Traffic

//TODO

## Coming Soon

* Inspect WebSocket messages.
* More configurable and flexible rules.
* Map response content as local file.
* Download captured request / response file.

















###  