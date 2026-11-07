const http = require('http');
const handler = require('serve-handler');

const port = process.env.PORT || 3000;

const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: 'dist',
    cleanUrls: true,
    headers: [
      {
        // Mismas cabeceras de seguridad que vercel.json (si se despliega en Railway).
        source: '**',
        headers: require('./vercel.json').headers.find(h => h.source === '/(.*)').headers
      },
      {
        source: '**/*.html',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' }
        ]
      },
      {
        source: 'index.html',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' }
        ]
      }
    ],
    rewrites: [
      { source: '**', destination: '/index.html' }
    ]
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Troncos Intergalácticos Astrobase Cadet running on http://0.0.0.0:${port}`);
});
