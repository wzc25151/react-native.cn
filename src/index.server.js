/**
 * Created by tdzl2003 on 8/10/16.
 */
/* eslint-disable import/no-extraneous-dependencies, global-require */

import * as path from 'path';
import Express from 'express';
import http from 'http';
import WebpackIsomorphicTools from 'webpack-isomorphic-tools';

const webpackIsomorphicTools = new WebpackIsomorphicTools(require('../webpack-isomorphic-tools'))
  .development(__DEV__);

const port = process.env.PORT || 8080;
const host = process.env.HOST || 'localhost';

const __DISABLE_SSR__ = process.env.DISABLE_SSR;

const app = new Express();
const server = new http.Server(app);

if (__DEV__) {
  require('./server/webpack').install(app);
  require('./server/statics').install(app);

  app.use((req, res, next) => {
    // Do not cache webpack stats: the script file would change since
    // hot module replacement is enabled in the development env
    webpackIsomorphicTools.refresh();
    next();
  });
}

webpackIsomorphicTools.server(path.resolve(__dirname, '..'), () => {
  if (!__DISABLE_SSR__) {
    require('./server/ssr').install(app);
  }

  app.use((req, res) => {
    const assets = webpackIsomorphicTools.assets();

    res.send(`<!doctype html>
<html>
  <head>
${
    res.ssrMeta || '<title>Loading...</title>'
}
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta httpEquiv="X-UA-Compatible" content="IE=Edge" />
${
      __DEV__ ?
      Object.keys(assets.styles).length === 0 && (
        `<style>
      ${
          Object.keys(assets.assets)
            .map(key => assets.assets[key])
            // eslint-disable-next-line no-underscore-dangle
            .filter(v => typeof v === 'object' && v._style)
            // eslint-disable-next-line no-underscore-dangle
            .map(v => v._style)
            .join('\n')
          }
    </style>`
      ) : Object.keys(assets.styles).map(style =>
        `    <link href="${assets.styles[style]}" media="screen, projection"
                rel="stylesheet" />`).join('\n')
      }
  </head>
  <body>
    <div id="content">${res.ssrString || ''}</div>
    <script>window.resources=${JSON.stringify(res.ssrResources || {}).replace(/<\/script>/i, '<\\/script>')}</script>
    <script>var duoshuoQuery = {short_name:"reactnative"}</script>
    <script src="http://static.duoshuo.com/embed.js"></script>
    <script src="${assets.javascript.index}" async></script>
  </body>
</html>`);
  });

  server.listen(port, host, (err) => {
    if (err) {
      console.error(err);
    }
    console.info('==> 💻  Open http://%s:%s in a browser to view the app.', host, port);
  });
});