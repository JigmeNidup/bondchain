import { getConfig } from "../config.js";

export class PinataService {
  async uploadFile(file: Express.Multer.File) {
    const config = getConfig();
    const form = new FormData();
    form.append("network", "public");
    form.append("file", new Blob([new Uint8Array(file.buffer)]), file.originalname);
    form.append("name", file.originalname);

    const response = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.pinataJwt}` },
      body: form,
    });
    if (!response.ok) throw new Error(`Pinata upload failed: ${response.status} ${await response.text()}`);

    const result = await response.json();
    const cid = result.data?.cid || result.IpfsHash || result.cid;
    if (!cid) throw new Error("Pinata upload response did not include a CID");

    return {
      cid: String(cid),
      raw: result,
    };
  }
}

export const pinataService = new PinataService();
