# An upload is not stored as it was uploaded

**Symptom:** the first spec for Capture (2026-11-23) filled a database from
the committed Seed, captured it, and expected every file back byte for byte.
The Resume came back identical. The headshot did not: 100,108 bytes went in
and 57,142 came out. The live site was already serving that 57 KB file, and
had been since it was seeded.

**Root cause:** Payload runs an upload through `sharp` whenever the file is
of a kind that can be animated — WebP and GIF — whether or not the
collection asks for any resizing (`payload/dist/uploads/generateFileData.js`).
The file is decoded and encoded again with default settings, so what is
stored is a new, smaller, slightly worse picture. PNG, JPEG and PDF are
stored as they arrive. Nothing in the admin or the logs says so.

Two things were built on the assumption that storage keeps bytes:

- The round trip "fill, then capture, gives the Seed back" holds for the
  JSON and does not hold for a WebP.
- Capture recognises a file the Seed already has by its bytes, to keep its
  name. With the original headshot in the Seed, the first Capture of the
  live site would not have recognised it, and would have written the live
  copy under the name storage gave it.

**Rule:**

- The Seed's copy of a file is what the site serves, not what was once
  uploaded. After the first Capture that is true by construction; a file
  put into `seed/files/` by hand is replaced by its stored version at the
  next Capture if it is a WebP or a GIF.
- A database filled from the Seed stores a WebP one generation further on
  than the Seed's. That is a throwaway database's business. Never capture
  from one into the repo: Capture is for the live site.
- A spec about uploaded bytes compares against what storage holds (the
  collection's `staticDir`), and uses a PDF or a PNG when it needs bytes
  that survive.
- Before asserting that a system hands back what it was given, try it once
  with each kind of thing it will be given.

**History:** 2026-11-23, PR 5 of the page builder. Found by the round-trip
spec on its first run. The Seed's headshot was replaced with the live
site's copy in the same PR.
