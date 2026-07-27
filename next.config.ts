/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { withPayload } from '@payloadcms/next/withPayload';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default withPayload(nextConfig);
