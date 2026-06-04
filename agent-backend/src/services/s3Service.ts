import dotenv from "dotenv";
import AWS from "aws-sdk";

dotenv.config();

const region = process.env.AWS_REGION;
const bucketName = process.env.AWS_S3_BUCKET_NAME;

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.warn("[S3Service] Warning: AWS credentials missing in .env!");
}

if (!region || !bucketName) {
  console.warn("[S3Service] Warning: AWS_REGION or AWS_S3_BUCKET_NAME missing in .env!");
}

const s3 = new AWS.S3({
  region,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: "v4",
});

/**
 * Checks whether an object exists in the S3 bucket.
 */
export async function checkS3ObjectExists(key: string): Promise<boolean> {
  if (!bucketName) return false;
  try {
    await s3.headObject({ Bucket: bucketName, Key: key }).promise();
    return true;
  } catch (err: any) {
    if (err && (err.code === "NotFound" || err.statusCode === 404)) {
      return false;
    }
    throw err;
  }
}

/**
 * Generates a presigned GET URL for an S3 object.
 * Defaults to 10 minutes expiration.
 */
export async function getPresignedUrl(key: string, expiresSeconds: number = 600): Promise<string> {
  if (!bucketName) throw new Error("AWS_S3_BUCKET_NAME is not configured");
  return s3.getSignedUrlPromise("getObject", {
    Bucket: bucketName,
    Key: key,
    Expires: expiresSeconds,
  });
}

/**
 * Uploads a file buffer to the S3 bucket.
 */
export async function uploadToS3(key: string, body: Buffer, contentType: string = "audio/mpeg"): Promise<void> {
  if (!bucketName) throw new Error("AWS_S3_BUCKET_NAME is not configured");
  await s3.putObject({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  }).promise();
}
