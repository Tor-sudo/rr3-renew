"use strict";
import sharp from 'sharp';
import { redirect } from './redirect.js';

// Define the sharpStream function
const sharpStream = () => sharp({ animated: !process.env.NO_ANIMATE, unlimited: true });

export function compressImg(request, reply, input) {
    const format = request.params.webp ? 'webp' : 'jpeg';

    // Create the Sharp instance with the specified options
    const sharpInstance = sharpStream()
        .grayscale(request.params.grayscale)
        .toFormat(format, {
            quality: request.params.quality,
            progressive: true,
            optimizeScans: true
        });

    // Pipe the input stream into the Sharp instance and convert it to a buffer
    input.body
        .pipe(sharpInstance)
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
            // Send the processed image as the response
            reply
                .header('content-type', 'image/' + format)
                .header('content-length', info.size)
                .header('x-original-size', request.params.originSize)
                .header('x-bytes-saved', request.params.originSize - info.size)
                .code(200)
                .send(data);
        })
        .catch(error => {
            console.error('Error during image compression:', error.message);
            redirect(request, reply);  // Handle the error by redirecting
        });
}
