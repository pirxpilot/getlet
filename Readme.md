[![NPM version][npm-image]][npm-url]
[![Build Status][build-image]][build-url]
[![Dependency Status][deps-image]][deps-url]


# getlet

HTTP(s) request with redirect, compress and streaming

To be used if you only need bare bones HTTP request and if you'd rather have your response processed downstream.

`getlet` will send the request, handle the redirects and pipe the response.
If you need anything more than this check [superagent] or [request].

`getlet` always asks for `gzip` or `deflate` encoding and decompresses the response,
but it won't do any other processing. It won't buffer the responses in any way.

## Examples

```javascript
  const getlet = require('getlet');

  // get URL and stream it
  getlet('http://google.com').pipe(stream);

  // configure URL from host and part
  getlet()
    .host('raw2.github.com')
    .path('/pirxpilot/liftie/master/.jshintrc')
    .secure(true)
    .on('error', errorHandler)
    .pipe(stream);

  // post some data
  getlet('https//example.com/form')
    .method('POST')
    .send(formData)
    .pipe(stream);

  // get URL and stream it, initialize later
  const request = getlet('http://google.com', false);
  setTimeout(function () {
    request.pipe(stream);
    request.init();
  }, 1000);
  // initialize later

```

## API


### `getlet(url, autoInit = true)`

`url` is an optional parameter - alternatively you can configure target using `host` and `path`
`autoInit` if false `init()` has to be called explicitly to trigger network request 

### `host(host)`

### `path(path)`

### `secure(on)`

if `on` is truthy use HTTPS instead of HTTP

### `userAgent(ua)`

set `User-Agent` header

### `header(name, value)`

set header `name` to `value`, also accepts an object treated as `name` -> `value`

### `auth(username, password)`

sets basic authentication `Authorization` header

### `send(data)`

sends `data` with the request

### `method(method)`

uses HTTP `method` (`POST`, `PUT` etc) - `GET` is used if `method` is not called

### `followRedirects(boolean)`

when called with `false` will prevent getlet from automatically following redirects

[request]: https://github.com/mikeal/request
[superagent]: http://visionmedia.github.io/superagent/

[npm-image]: https://img.shields.io/npm/v/getlet
[npm-url]: https://npmjs.org/package/getlet

[build-image]: https://img.shields.io/github/actions/workflow/status/pirxpilot/getlet/check.yaml?branch=main
[build-url]: https://github.com/pirxpilot/getlet/actions/workflows/check.yaml

[deps-image]: https://img.shields.io/librariesio/release/npm/getlet
[deps-url]: https://libraries.io/npm/getlet

