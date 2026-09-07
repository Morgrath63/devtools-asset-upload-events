import {z} from "zod";
import {infrai} from "./infrai.js";

export const uploadRequest = z.object({assetId: z.string().min(1), contentType: z.string().min(1), sizeBytes: z.number().int().positive()});
export type BuildEvent = {type: "asset.upload.requested"; assetId: string; key: string; uploadUrl: string};

const bucket = "devtools-assets";
let bucketReady: Promise<unknown> | undefined;
function ensureBucket() { return bucketReady ?? (bucketReady = infrai.storage.bucket.create({name: bucket}).catch(() => undefined)); }

export async function createUploadEvent(input: unknown): Promise<BuildEvent> {
  const request = uploadRequest.parse(input);
  await ensureBucket();
  const key = `assets/${request.assetId}`;
  const signed = await infrai.storage.object.presign(bucket, key, {op: "put", expires_seconds: 900, content_type: request.contentType, max_bytes: request.sizeBytes, idempotency_key: `upload-${request.assetId}`});
  return {type: "asset.upload.requested", assetId: request.assetId, key, uploadUrl: signed.url};
}

export function diagnose(event: BuildEvent): string { return event.uploadUrl.startsWith("http") ? "upload-url-issued" : "upload-url-invalid"; }

if (import.meta.url === `file://${process.argv[1]}`) {
  const assetId = process.argv[2] ?? "cover-art-001";
  createUploadEvent({assetId, contentType: "image/png", sizeBytes: 2_000_000}).then((event) => console.log(JSON.stringify({event, diagnostic: diagnose(event)}, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
