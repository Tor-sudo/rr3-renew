"use strict";
import axios from 'axios';
import http2 from 'http2-wrapper';
import lodash from 'lodash';
import { generateRandomIP, randomUserAgent } from './utils.js';
import { copyHeaders as copyHdrs } from './copyHeaders.js';
import { compressImg as applyCompression } from './compress.js';
import { bypass as performBypass } from './bypass.js';
import { shouldCompress as checkCompression } from './shouldCompress.js';

const viaHeaders = [
    '2 example-proxy-service.com (ExampleProxy/1.0)',
    '2 another-proxy.net (Proxy/2.0)',
    '2 different-proxy-system.org (DifferentProxy/3.1)',
    '2 some-proxy.com (GenericProxy/4.0)',
];

function randomVia() {
    const index = Math.floor(Math.random() * viaHeaders.length);
    return viaHeaders[index];
}

export async function processRequest(request, reply) {
    let url = request.query.url;
    if (Array.isArray(url)) url = url.join('&url=');

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

    url = url.replace(/http:\/\/2\.0\.\d\.\d\/bmi\/(https?:\/\/)?/i, 'http://');

    request.params.url = url;
    request.params.webp = !request.query.jpeg;
    request.params.grayscale = request.query.bw != '0';
    request.params.quality = parseInt(request.query.l, 10) || 40;

    const randomIP = generateRandomIP();
    const userAgent = randomUserAgent();

    try {
        const response = await axios({
            method: 'get',   // Explicitly use GET method
            url: request.params.url,
            headers: {
                ...lodash.pick(request.headers, ['cookie', 'dnt', 'referer']),
                'user-agent': userAgent,
                'x-forwarded-for': randomIP,
                'via': randomVia(),
            },
            responseType: 'stream', // Handle response as a stream
            timeout: 10000,
            maxRedirects: 5,
            decompress: false,
            validateStatus: function (status) {
                return status >= 200 && status < 300; // Accept only 2xx status codes
            },
            httpAgent: new http2.Agent({   // Use HTTP/2 agent with keepAlive
                keepAlive: true
            }),
        });

        copyHdrs(response, reply);
        reply.header('content-encoding', 'identity');
        request.params.originType = response.headers['content-type'] || '';
        request.params.originSize = parseInt(response.headers['content-length'], 10) || 0;

        const input = { body: response.data }; // Stream response data

        if (checkCompression(request)) {
            return applyCompression(request, reply, input);
        } else {
            return performBypass(request, reply, response.data);
        }
    } catch (err) {
        reply
            .code(500)
            .send();
    }
}
