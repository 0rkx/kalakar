import * as functions from 'firebase-functions';
import axios from 'axios';
import * as sharp from 'sharp';
import { storage } from './firebase-config';

interface EnhancePhotoRequest {
    imageData: string; // base64 encoded image
    userId: string;
    fileName: string;
}

const PROJECT_ID = process.env.GCLOUD_PROJECT;
const LOCATION = 'us-central1'; // e.g., 'us-central1'

export const enhancePhoto = functions.https.onCall(async (data: EnhancePhotoRequest, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { imageData, userId, fileName } = data;

    if (!imageData || !userId || !fileName) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required data.');
    }

    try {
        // 1. Remove background using Vertex AI
        const accessToken = (await functions.config().google.credential.getAccessToken()).access_token;
        const apiUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-capability-001:predict`;

        const requestBody = {
            instances: [
                {
                    prompt: "a clean, neutral, professional background for a product photo",
                    referenceImages: [
                        {
                            referenceType: "REFERENCE_TYPE_RAW",
                            referenceId: 1,
                            referenceImage: {
                                bytesBase64Encoded: imageData
                            }
                        },
                        {
                            referenceType: "REFERENCE_TYPE_MASK",
                            referenceId: 2,
                            maskImageConfig: {
                                maskMode: "MASK_MODE_BACKGROUND"
                            }
                        }
                    ]
                }
            ],
            parameters: {
                editMode: "EDIT_MODE_BGSWAP",
                sampleCount: 1
            }
        };

        const response = await axios.post(apiUrl, requestBody, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const enhancedImageData = response.data.predictions[0].bytesBase64Encoded;
        const enhancedImageBuffer = Buffer.from(enhancedImageData, 'base64');

        // 2. Resize image using sharp
        const sizes = {
            amazon: { width: 1000, height: 1000 },
            etsy: { width: 570, height: 456 },
            whatsapp: { width: 400, height: 400 }
        };

        const bucket = storage.bucket();
        const uploadedUrls = {};

        for (const [platform, dimensions] of Object.entries(sizes)) {
            const resizedImageBuffer = await sharp(enhancedImageBuffer)
                .resize(dimensions.width, dimensions.height)
                .toBuffer();

            const filePath = `enhanced_photos/${userId}/${platform}_${fileName}`;
            const file = bucket.file(filePath);

            await file.save(resizedImageBuffer, {
                metadata: {
                    contentType: 'image/png'
                }
            });

            uploadedUrls[platform] = await file.getSignedUrl({
                action: 'read',
                expires: '03-09-2491'
            }).then(urls => urls[0]);
        }

        return { success: true, urls: uploadedUrls };

    } catch (error) {
        console.error('Error enhancing photo:', error.response ? error.response.data : error.message);
        throw new functions.https.HttpsError('internal', 'Failed to enhance photo.', error);
    }
});
