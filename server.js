#!/usr/bin/env node
'use strict';

import fastify from 'fastify';
import { processRequest } from './src/proxy.js'; // Import the named export

const app = fastify({ 
  logger: true // Reduced logging level for performance
          // Enable trust proxy for reverse proxies
});

const PORT = process.env.PORT || 8080;

// Favicon route for status 204
app.get('/favicon.ico', async (request, reply) => {
  reply.code(204).send(); // Send a 204 No Content response for the favicon
});

// Main route directly linked to processRequest
app.get('/', processRequest);

// Start the server
const start = async () => {
  try {
    await app.listen({ host: '0.0.0.0', port: PORT });
    console.log(`Server listening on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
