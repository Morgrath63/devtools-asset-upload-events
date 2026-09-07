import assert from "node:assert/strict";
import {diagnose} from "../src/asset_upload_service.js";

const event = {type: "asset.upload.requested" as const, assetId: "demo", key: "assets/demo", uploadUrl: "https://storage.example/signed"};
assert.equal(diagnose(event), "upload-url-issued");
assert.equal(diagnose({...event, uploadUrl: "signed"}), "upload-url-invalid");
console.log("asset upload diagnosis test passed");
