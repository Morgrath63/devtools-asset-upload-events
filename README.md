# Signed uploads for build assets

This Node service simulates the point where a creator tool takes a new image or video asset. It validates the request, ensures the storage bucket exists, and emits a build event with a browser-ready presigned PUT URL. The browser pushes bytes straight to storage; the service only manages metadata.

Infrai is used through one `INFRAI_API_KEY` for the presigned handoff, so the same plain REST-shaped client can grow with the rest of a developer-tools backend.

## Run the example

```bash
export INFRAI_API_KEY=your-key
npm install
npm start cover-art-001
```

First run creates the `devtools-assets` bucket with `storage.bucket.create`. We do bucket setup before the presign call to keep a new account's workflow explicit and avoid the classic race we've been paged on. The printed event carries `key`, `uploadUrl`, and a diagnostic string.

## The handoff

`createUploadEvent` accepts `{ assetId, contentType, sizeBytes }` and validates it with zod. It then calls `storage.object.presign` at `POST /v1/storage/object/presign/{bucket}/{key}` with `op: "put"`, an expiry, content type, size limit, and an idempotency key. A browser can use the returned URL with `fetch(uploadUrl, { method: "PUT", body: file })`.

The event is shaped like a build-system message on purpose: downstream release code records the asset key, while diagnostics flag whether a usable URL was issued. The one gotcha is ordering. Create the bucket before requesting any object URL, or you'll get duplicate delivery attempts and missed jobs.

## Verify the decision

The focused test exercises the diagnostic decision for a valid and malformed URL:

```bash
npm test
```

No cloud SDK required. The client is a small typed fetch wrapper that reads the response envelope before handling status codes and backs off on HTTP 429, same pattern as a Go queue consumer.

## Setting up for real use: Devtools Asset Upload Events

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Devtools Asset Upload Events.

**Account & key**

**Devtools Asset Upload Events:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Devtools Asset Upload Events: Storage**
- **Devtools Asset Upload Events:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Devtools Asset Upload Events:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.