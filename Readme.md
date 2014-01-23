#getlet

HTTP(s) get request with redirect, compress and streaming

If you only need HTTP GET and if you want you response processing happen downstream.
`getlet` will send the request, handle the redirects and pipe the response.
If you need more than this check superagent or request.

`getlet` always asks for `gzip` or `deflate` encoding and decompresses the response,
but it won't do any other processing. It won't buffer the responses in any way.

# Examples

```javascript
  // get URL and stream it
  getlet('http://google.com').pipe(stream);

  // configure URL from host and part
  getlet()
    .host('raw2.github.com')
    .path('/code42day/liftie/master/.jshintrc')
    .secure(true)
    .pipe(stream)
    .on('error', errorHandler); // errors are passed downstream
```

