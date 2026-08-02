/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  commentNotificationEmail,
  contactNotificationEmail,
  newsletterConfirmEmail,
} from '@/lib/email/templates';

describe('email templates', () => {
  it('renders the contact notification with reason label and services', () => {
    const email = contactNotificationEmail({
      email: 'ada@example.com',
      message: 'Ship it.',
      name: 'Ada',
      reason: 'services',
      serviceNames: ['AI enablement'],
    });
    expect(email.subject).toBe('[mkelley33.com] request services — Ada');
    expect(email.text).toContain('Ada <ada@example.com>');
    expect(email.text).toContain('AI enablement');
    expect(email.text).toContain('Ship it.');
  });

  it('omits the services line when none were requested', () => {
    const email = contactNotificationEmail({
      email: 'a@b.com',
      message: 'hello there world',
      name: 'B',
      reason: 'general',
      serviceNames: [],
    });
    expect(email.text).not.toContain('services:');
  });

  it('renders the confirm email around the url', () => {
    const email = newsletterConfirmEmail('https://x.test/confirm?token=abc');
    expect(email.subject).toContain('confirm');
    expect(email.text).toContain('https://x.test/confirm?token=abc');
  });

  it('renders the comment notification with title, author, and moderation link', () => {
    const email = commentNotificationEmail({
      authorEmail: 'ada@example.com',
      authorName: 'Ada',
      body: 'Nice post!',
      moderateUrl: 'https://x.test/admin/collections/comments/c1',
      postTitle: 'Hello World',
    });
    expect(email.subject).toBe('[mkelley33.com] new comment on "Hello World" — Ada');
    expect(email.text).toContain('Ada <ada@example.com>');
    expect(email.text).toContain('Nice post!');
    expect(email.text).toContain('https://x.test/admin/collections/comments/c1');
  });

  it('marks a missing commenter email as not provided', () => {
    const email = commentNotificationEmail({
      authorEmail: '',
      authorName: 'Ada',
      body: 'Nice post!',
      moderateUrl: 'https://x.test/admin/collections/comments/c1',
      postTitle: 'Hello World',
    });
    expect(email.text).toContain('not provided');
  });
});
