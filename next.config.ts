import type { NextConfig } from 'next';

import { withPayload } from '@payloadcms/next/withPayload';

const nextConfig: NextConfig = {
  // Cold builds (CI runners, fresh deploys) can freeze prerender workers for
  // >60s while they synchronously evaluate the large Payload/Mongoose server
  // chunks; the default 60s limit then kills DB-backed pages mid-render.
  staticPageGenerationTimeout: 180,
};

export default withPayload(nextConfig);
