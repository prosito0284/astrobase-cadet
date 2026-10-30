const http = require('http');
const handler = require('serve-handler');

const port = process.env.PORT || 3000;

const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: 'dist',
    cleanUrls: true,
    rewrites: [
      { source: '**', destination: '/index.html' }
    ]
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Troncos Intergalácticos Astrobase Cadet running on http://0.0.0.0:${port}`);
});
