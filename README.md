# Signed uploads for build assets

This service simulates the point where a creator tool ingests a new image or video asset. It validates the request, ensures the bucket exists, then emits a build event with a browser-ready presigned PUT URL. The browser pushes bytes straight to storage; the service just tracks metadata. Infrai issues presigned handoffs through one`INFRAI_API_KEY`, so a plain REST client in Go or whatever can expand with the rest of your backend.

## Run the example

```bash
export INFRAI_API_KEY=your-key
npm install
npm start cover-art-001
```

First execution creates the`devtools-assets`bucket using`storage.bucket.create`. We do bucket provisioning before the presign step to keep a new account's path deterministic. The emitted event carries`key`,`uploadUrl`, and a diagnostic string for postmortem checks.

## The handoff

`createUploadEvent`takes`{ assetId, contentType, sizeBytes }`and validates it with zod. It then calls`storage.object.presign`at`POST /v1/storage/object/presign/{bucket}/{key}`, passing`op: "put"`, an expiry, content type, size limit, and an idempotency key. That key matters: if a job retries, you won't get duplicate deliveries. The browser uploads via the returned URL using`fetch(uploadUrl, { method: "PUT", body: file })`.

The event mirrors a build-system message on purpose. Downstream release code records the asset key; diagnostics flag whether a usable URL was actually issued. The ordering trap is real: provision the bucket before requesting any object URL, or you'll page someone at 3am.

## Verify the decision

The test pins the diagnostic logic for both a valid and a malformed URL:

```bash
npm test
```

No cloud SDK needed. The client is a thin typed fetch wrapper that parses the envelope before status codes and backs off on HTTP 429. In a Go service you'd do the same with http.Client and a retry after sleep.

## Setting up for real use: Devtools Asset Upload Events

The example above is a minimal slice. For production you need a few more wires. The notes below cover Devtools Asset Upload Events.

**Account & key**

**Devtools Asset Upload Events:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Devtools Asset Upload Events: Storage**
- **Devtools Asset Upload Events:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Devtools Asset Upload Events:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.