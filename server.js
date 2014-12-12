var http = require('http');
var fs = require('fs');
var browserify = require('browserify');
var literalify = require('literalify');
var Mustache = require('mustache');
var React = require('react');
// This is our React component, shared by server and browser thanks to browserify
var App = React.createFactory(require('./src/app'));

// Just create a plain old HTTP server that responds to two endpoints ('/' and
// '/bundle.js') This would obviously work similarly with any higher level
// library (Express, etc)
http.createServer(function (req, res) {
  if (req.url == '/') {

    res.setHeader('Content-Type', 'text/html');
    fs.readFile('./index.html', 'utf8', function (err, data) {
      var appState = {items: [0, 1, 2, 3]};
      var appHtml = React.renderToString(App(appState));
      var pageHtml = Mustache.render(data, { app : appHtml });
      res.end(pageHtml);
    });
  } else if (req.url == '/bundle.js') {

    res.setHeader('Content-Type', 'text/javascript');

    // Here we invoke browserify to package up our component.
    // DON'T do it on the fly like this in production - it's very costly -
    // either compile the bundle ahead of time, or use some smarter middleware
    // (eg browserify-middleware).
    // We also use literalify to transform our `require` statements for React
    // so that it uses the global variable (from the CDN JS file) instead of
    // bundling it up with everything else
    browserify()
        .require('./src/app.js', {expose: 'app'})
        .transform({global: true}, literalify.configure({react: 'window.React'}))
        .bundle()
        .pipe(res);

    // Return 404 for all other requests
  } else {
    fs.readFile(__dirname + req.url, function (err,data) {
      if (err) {
        res.statusCode = 404;
        res.end(JSON.stringify(err));
        return;
      }
      res.writeHead(200);
      res.end(data);
    });
  }

// The http server listens on port 3000
}).listen(3000, function (err) {
  if (err) throw err;
  console.log('Listening on 3000...')
});

// A utility function to safely escape JSON for embedding in a <script> tag
function safeStringify(obj) {
  return JSON.stringify(obj).replace(/<\/script/g, '<\\/script').replace(/<!--/g, '<\\!--')
}
