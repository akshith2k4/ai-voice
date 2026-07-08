import { S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config.js";

const { region, bucketName, accessKeyId, secretAccessKey } = config.aws;

if (!accessKeyId || !secretAccessKey) {
  console.warn("[S3Service] Warning: AWS credentials missing in .env!");
}

if (!region || !bucketName) {
  console.warn("[S3Service] Warning: AWS_REGION or AWS_S3_BUCKET_NAME missing in .env!");
}

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: region || "us-east-1",
      credentials: accessKeyId && secretAccessKey ? {
        accessKeyId,
        secretAccessKey,
      } : undefined,
    });
  }
  return s3Client;
}

/**
 * Checks whether an object exists in the S3 bucket.
 */
export async function checkS3ObjectExists(key: string): Promise<boolean> {
  if (!bucketName) return false;
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    return true;
  } catch (err: any) {
    if (err && (err.name === "NotFound" || err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404)) {
      return false;
    }
    throw err;
  }
}

/**
 * Generates a presigned GET URL for an S3 object.
 * Defaults to 10 minutes expiration.
 */
export async function getPresignedUrl(key: string, expiresSeconds: number = 86400): Promise<string> {
  if (!bucketName) throw new Error("AWS_S3_BUCKET_NAME is not configured");
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  return getSignedUrl(getClient(), command, { expiresIn: expiresSeconds });
}

/**
 * Uploads a file buffer to the S3 bucket.
 */
export async function uploadToS3(key: string, body: Buffer, contentType: string = "audio/mpeg"): Promise<void> {
  if (!bucketName) throw new Error("AWS_S3_BUCKET_NAME is not configured");
  await getClient().send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

/**
 * Downloads an object from S3 and returns it as a Buffer.
 */
export async function getObjectFromS3(key: string): Promise<Buffer> {
  if (!bucketName) throw new Error("AWS_S3_BUCKET_NAME is not configured");
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  
  const response = await getClient().send(command);
  
  if (!response.Body) {
    throw new Error(`Empty response body for S3 key: ${key}`);
  }

  // Convert the stream to a Buffer
  const chunks: Uint8Array[] = [];
  // @ts-ignore - Body is a stream
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
}

