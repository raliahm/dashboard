import { createServer } from 'http';
import { parse } from 'url';
import fs from 'fs';
import path from 'path';

export function apiPlugin() {
  return {
    name: 'api-plugin',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        try {
          const parsedUrl = parse(req.url, true);
          const pathname = parsedUrl.pathname;
          
          // Handle dynamic routes like /api/todos/123
          let apiPath;
          let params = {};
          
          if (pathname.match(/^\/todos\/\d+$/)) {
            // Handle /api/todos/[id]
            const id = pathname.split('/')[2];
            params.id = id;
            apiPath = path.join(process.cwd(), 'api/todos/[id].js');
          } else if (pathname.match(/^\/classes\/\d+$/)) {
            // Handle /api/classes/[id]
            const id = pathname.split('/')[2];
            params.id = id;
            apiPath = path.join(process.cwd(), 'api/classes/[id].js');
          } else {
            // Handle static routes like /api/todos, /api/classes
            apiPath = path.join(process.cwd(), `api${pathname}.js`);
          }
          
          if (fs.existsSync(apiPath)) {
            // Import the API handler
            const { default: handler } = await import(`file://${apiPath}?t=${Date.now()}`);
            
            // Create mock req/res objects compatible with your handlers
            const mockReq = {
              method: req.method,
              headers: req.headers,
              url: req.url,
              query: { ...parsedUrl.query, ...params },
              body: req.method !== 'GET' ? await getBody(req) : {}
            };
            
            const mockRes = {
              status: (code) => ({ json: (data) => res.writeHead(code, { 'Content-Type': 'application/json' }) && res.end(JSON.stringify(data)) }),
              json: (data) => res.writeHead(200, { 'Content-Type': 'application/json' }) && res.end(JSON.stringify(data))
            };
            
            await handler(mockReq, mockRes);
          } else {
            next();
          }
        } catch (error) {
          console.error('API Error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    }
  };
}

async function getBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}
