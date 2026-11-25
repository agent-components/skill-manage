import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

let client: S3Client | null = null;

export function getBucket() {
  return requireEnv("MINIO_BUCKET");
}

export function getS3Client() {
  if (client) return client;
  client = new S3Client({
    endpoint: requireEnv("MINIO_ENDPOINT"),
    region: process.env.MINIO_REGION || "us-east-1",
    credentials: {
      accessKeyId: requireEnv("MINIO_ACCESS_KEY"),
      secretAccessKey: requireEnv("MINIO_SECRET_KEY"),
    },
    forcePathStyle: true,
  });
  return client;
}

export function packageZipKey(ownerId: string, skillId: string, version: string) {
  return `${ownerId}/${skillId}/${version}/package.zip`;
}

export function packageFileKey(
  ownerId: string,
  skillId: string,
  version: string,
  filePath: string
) {
  return `${ownerId}/${skillId}/${version}/files/${filePath}`;
}

export async function putObject(key: string, body: Buffer | Uint8Array, contentType?: string) {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await getS3Client().send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  );
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Empty object: ${key}`);
  return Buffer.from(bytes);
}

export async function deleteObjects(keys: string[]) {
  if (keys.length === 0) return;
  // S3 DeleteObjects max 1000
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    await getS3Client().send(
      new DeleteObjectsCommand({
        Bucket: getBucket(),
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
  }
}
