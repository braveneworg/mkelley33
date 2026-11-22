/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { PORT_COLLISION_ATTEMPTS, retryOnPortCollision } from '@/test/retry-port-collision';

/** The message mongodb-memory-server raises when mongod loses the race for its port. */
const collision = (): Error => new Error('Port "62592" already in use');

describe('retryOnPortCollision', () => {
  it('returns the first result when the start succeeds', async () => {
    const start = vi.fn().mockResolvedValue('server');

    await expect(retryOnPortCollision(start)).resolves.toBe('server');
  });

  it('does not start again after a success', async () => {
    const start = vi.fn().mockResolvedValue('server');

    await retryOnPortCollision(start);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts again when the port was taken, and returns the later result', async () => {
    const start = vi.fn().mockRejectedValueOnce(collision()).mockResolvedValue('server');

    await expect(retryOnPortCollision(start)).resolves.toBe('server');
  });

  it('gives up with the collision once every attempt lost the race', async () => {
    const start = vi.fn().mockRejectedValue(collision());

    await expect(retryOnPortCollision(start)).rejects.toThrow('already in use');
  });

  it('stops at the attempt limit', async () => {
    const start = vi.fn().mockRejectedValue(collision());

    await retryOnPortCollision(start).catch(() => undefined);

    expect(start).toHaveBeenCalledTimes(PORT_COLLISION_ATTEMPTS);
  });

  it('rethrows any other failure', async () => {
    const start = vi.fn().mockRejectedValue(new Error('mongod binary missing'));

    await expect(retryOnPortCollision(start)).rejects.toThrow('mongod binary missing');
  });

  it('does not retry any other failure', async () => {
    const start = vi.fn().mockRejectedValue(new Error('mongod binary missing'));

    await retryOnPortCollision(start).catch(() => undefined);

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('rethrows a rejection that is not an Error without retrying', async () => {
    const start = vi.fn().mockRejectedValue('already in use');

    await retryOnPortCollision(start).catch(() => undefined);

    expect(start).toHaveBeenCalledTimes(1);
  });
});
