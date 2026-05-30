const { S3Client } = require("@aws-sdk/client-s3");

// 1. Grab variables
const endpoint = process.env.DO_SPACES_ENDPOINT;
const accessKey = process.env.DO_SPACES_KEY;
const secretKey = process.env.DO_SPACES_SECRET;

// 2. Prevent silent hanging: check if keys actually exist
if (!accessKey) {
    console.error("CRITICAL ERROR: DO_SPACES_KEY is UNDEFINED. Node cannot see the .env file!");
} else {
    console.log("DO_SPACES_KEY is successfully loaded inside Node!");
}

// 3. Create the client (Fallback to fake keys so the AWS SDK never hangs)
const doSpaceClient = new S3Client({
    endpoint: endpoint || "https://fra1.digitaloceanspaces.com",
    region: "fra1",
    credentials: {
        accessKeyId: accessKey || "MISSING_KEY",
        secretAccessKey: secretKey || "MISSING_SECRET",
    },
    forcePathStyle: false
});

module.exports = {
    s3Internal: doSpaceClient,
    s3External: doSpaceClient
};