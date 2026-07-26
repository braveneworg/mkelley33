// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  confirmSubscriber,
  unsubscribeSubscriber,
  upsertPendingSubscriber,
} from '@/lib/repositories/subscribers';

const create = vi.fn();
const find = vi.fn();
const update = vi.fn();

vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ create, find, update })) }));
vi.mock('@payload-config', () => ({ default: {} }));

/** Payload's `find` returns a paginated envelope; only `docs` is read here. */
const docs = (...found: unknown[]) => ({ docs: found });

const duplicateKeyError = () =>
  new Error('E11000 duplicate key error collection: test.subscribers index: email_1');

beforeEach(() => {
  create.mockReset();
  find.mockReset();
  update.mockReset();
});

describe('upsertPendingSubscriber', () => {
  it('leaves an active subscriber alone and reports it as already active', async () => {
    find.mockResolvedValue(docs({ id: '1', status: 'active' }));

    await expect(upsertPendingSubscriber('Someone@Example.com ')).resolves.toEqual({
      alreadyActive: true,
      rawToken: null,
    });
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('normalises the email before looking it up', async () => {
    find.mockResolvedValue(docs());
    create.mockResolvedValue({});

    await upsertPendingSubscriber('  MiXeD@Example.COM  ');

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: { equals: 'mixed@example.com' } } })
    );
  });

  it('re-arms an existing non-active subscriber, clearing confirm and unsubscribe stamps', async () => {
    find.mockResolvedValue(docs({ id: '7', status: 'unsubscribed' }));

    const result = await upsertPendingSubscriber('a@b.com');

    expect(result.alreadyActive).toBe(false);
    expect(result.rawToken).toEqual(expect.any(String));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          confirmedAt: null,
          status: 'pending',
          unsubscribedAt: null,
        }),
        id: '7',
      })
    );
  });

  it('creates a pending subscriber when none exists', async () => {
    find.mockResolvedValue(docs());
    create.mockResolvedValue({});

    const result = await upsertPendingSubscriber('new@b.com');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'new@b.com', status: 'pending' }),
      })
    );
    expect(result.rawToken).toEqual(expect.any(String));
  });

  it('re-arms the winning document when a concurrent request wins the unique index', async () => {
    find
      .mockResolvedValueOnce(docs())
      .mockResolvedValueOnce(docs({ id: 'raced', status: 'pending' }));
    create.mockRejectedValue(duplicateKeyError());

    const result = await upsertPendingSubscriber('race@b.com');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: 'raced' }));
    expect(result).toEqual({ alreadyActive: false, rawToken: expect.any(String) });
  });

  it('rethrows a duplicate-key error when the racing document cannot be found', async () => {
    find.mockResolvedValue(docs());
    create.mockRejectedValue(duplicateKeyError());

    await expect(upsertPendingSubscriber('ghost@b.com')).rejects.toThrow('E11000');
    expect(update).not.toHaveBeenCalled();
  });

  it('rethrows any error that is not a unique-index collision', async () => {
    find.mockResolvedValue(docs());
    create.mockRejectedValue(new Error('disk full'));

    await expect(upsertPendingSubscriber('boom@b.com')).rejects.toThrow('disk full');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('confirmSubscriber', () => {
  it('rejects an unknown token', async () => {
    find.mockResolvedValue(docs());

    await expect(confirmSubscriber('nope')).resolves.toBe(false);
  });

  it('is idempotent for an already-active subscriber', async () => {
    find.mockResolvedValue(docs({ id: '1', status: 'active' }));

    await expect(confirmSubscriber('tok')).resolves.toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses to reactivate an unsubscribed subscriber', async () => {
    find.mockResolvedValue(docs({ id: '1', status: 'unsubscribed' }));

    await expect(confirmSubscriber('tok')).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it('activates a pending subscriber and stamps confirmedAt', async () => {
    find.mockResolvedValue(docs({ id: '9', status: 'pending' }));

    await expect(confirmSubscriber('tok')).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ confirmedAt: expect.any(String), status: 'active' }),
        id: '9',
      })
    );
  });
});

describe('unsubscribeSubscriber', () => {
  it('rejects an unknown token', async () => {
    find.mockResolvedValue(docs());

    await expect(unsubscribeSubscriber('nope')).resolves.toBe(false);
  });

  it('is idempotent for an already-unsubscribed subscriber', async () => {
    find.mockResolvedValue(docs({ id: '1', status: 'unsubscribed' }));

    await expect(unsubscribeSubscriber('tok')).resolves.toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it('unsubscribes an active subscriber and stamps unsubscribedAt', async () => {
    find.mockResolvedValue(docs({ id: '4', status: 'active' }));

    await expect(unsubscribeSubscriber('tok')).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'unsubscribed',
          unsubscribedAt: expect.any(String),
        }),
        id: '4',
      })
    );
  });
});
