const { S3Client } = require("@aws-sdk/client-s3");

// Connects to your local MinIO container
const s3Client = new S3Client({
    region: "us-east-1",
    credentials: {
        accessKeyId: "admin",
        secretAccessKey: "password123",
    },
    endpoint: "http://localhost:9000",
    forcePathStyle: true, 
});

module.exports = s3Client;