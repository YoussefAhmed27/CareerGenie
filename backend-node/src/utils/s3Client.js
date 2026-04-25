const { S3Client } = require("@aws-sdk/client-s3");

const minioHost = process.env.MINIO_ENDPOINT || 'localhost';
const minioPort = process.env.MINIO_PORT || '9000';

const s3Internal = new S3Client({
    region: "us-east-1",
    credentials: {
        accessKeyId: "admin",
        secretAccessKey: "password123",
    },
    endpoint: `http://${minioHost}:${minioPort}`,
    forcePathStyle: true, 
});

const s3External = new S3Client({
    region: "us-east-1",
    credentials: {
        accessKeyId: "admin",
        secretAccessKey: "password123",
    },
    endpoint: process.env.EXTERNAL_MINIO_URL || "http://localhost:9000",
    forcePathStyle: true, 
});

module.exports = { s3Internal, s3External };