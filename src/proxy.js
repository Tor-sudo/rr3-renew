"use strict";
import axios from 'axios';
import lodash from 'lodash';
import { generateRandomIP, randomUserAgent } from './utils.js';
import { copyHeaders as copyHdrs } from './copyHeaders.js';
import { compressImg as applyCompression } from './compress.js';
import { bypass as performBypass } from './bypass.js';
import { shouldCompress as checkCompression } from './shouldCompress.js';

const viaHeaders = [
    '1.1 example-proxy-service.com (ExampleProxy/1.0)',
    '1.0 another-proxy.net (Proxy/2.0)',
    '1.1 different-proxy-system.org (DifferentProxy/3.1)',
    '1.1 some-proxy.com (GenericProxy/4.0)',
];

function randomVia() {
    const index = Math.floor(Math.random() * viaHeaders.length);
    return viaHeaders[index];
}

export async function processRequest(request, reply) {
    let url = request.query.url;

    if (!url) {
        const ipAddress = generateRandomIP();
        const ua = randomUserAgent();
        const hdrs = {
            ...lodash.pick(request.headers, ['cookie', 'dnt', 'referer']),
            'x-forwarded-for': ipAddress,
            'user-agent': ua,
            'via': randomVia(),
        };

        Object.entries(hdrs).forEach(([key, value]) => reply.header(key, value));
        
        return reply.send(`bandwidth-hero-proxy`);
    }

    request.params.url = decodeURIComponent(url);
    request.params.webp = !request.query.jpeg;
    request.params.grayscale = request.query.bw != '0';
    request.params.quality = parseInt(request.query.l, 10) || 40;

    const randomIP = generateRandomIP();
    const userAgent = randomUserAgent();

    try {
        const response = await axios.get(request.params.url, {
            headers: {
                ...lodash.pick(request.headers, ['cookie', 'dnt', 'referer']),
                'user-agent': userAgent,
                'x-forwarded-for': randomIP,
                'via': randomVia(),
            },
            responseType: 'stream', // Handle response as a stream
            timeout: 10000,
            maxRedirects: 5, // Max redirects allowed
            decompress: false,
        });

        // Proceed only if status code is 200
        copyHdrs(response, reply);  // Copy headers from response to reply
        reply.header('content-encoding', 'identity');
        request.params.originType = response.headers['content-type'] || '';
        request.params.originSize = parseInt(response.headers['content-length'], 10) || 0;

        const input = { body: response.data }; // Pass the stream

        if (checkCompression(request)) {
            return applyCompression(request, reply, input);
        } else {
            return performBypass(request, reply, response.data);
        }
    } catch (err) {
        // Non-200 status or any other error, close the stream and send a basic error response
        reply
            .code(500)  // Internal server error
            .send();
    }
}
