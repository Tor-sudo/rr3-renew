#!/usr/bin/env node
'use strict';
import fs from 'fs';
import fastify from 'fastify';
import { processRequest } from './src/proxy.js'; // Import the named export

const app = fastify({ 
  logger: false, // Reduced logging level for performance
  trustProxy: true// Enable trust proxy for reverse proxies
  
  https: {
    key: fs.readFileSync('./server.key')),
    cert: fs.readFileSync('./server.cert')
}
});

const PORT = process.env.PORT || 8080;

app.get('/', processRequest);
app.listen({host: '0.0.0.0', port: PORT });
