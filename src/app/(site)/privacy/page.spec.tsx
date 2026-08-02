/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { ConsentProvider } from '@/components/consent/consent-provider';

import PrivacyPage, { metadata } from './page';

const renderPage = () =>
  render(
    <ConsentProvider>
      <PrivacyPage />
    </ConsentProvider>
  );

describe('PrivacyPage', () => {
  it('titles itself privacy', () => {
    expect(metadata.title).toBe('privacy');
  });

  it('names the controller', () => {
    renderPage();
    // Art. 13(1)(a) makes the controller's identity mandatory, so pin the
    // sentence itself — a heading assertion survives deleting the name.
    expect(
      screen.getByText(/Michaux Kelley runs this site and is the data controller/)
    ).toBeInTheDocument();
  });

  it('points data requests at the contact form', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'contact form' })).toHaveAttribute('href', '/contact');
  });

  it('links to google’s privacy policy', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /google privacy policy/ })).toHaveAttribute(
      'href',
      'https://policies.google.com/privacy'
    );
  });

  it('links to google’s partner-sites disclosure', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /how google uses partner data/ })).toHaveAttribute(
      'href',
      'https://policies.google.com/technologies/partner-sites'
    );
  });

  it('links to cloudflare’s privacy policy', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /cloudflare privacy policy/ })).toHaveAttribute(
      'href',
      'https://www.cloudflare.com/privacypolicy/'
    );
  });

  it('states the 14-month analytics retention', () => {
    renderPage();
    expect(screen.getByText(/14 months/)).toBeInTheDocument();
  });

  it('offers the manage-preferences button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'manage cookie preferences' })).toBeInTheDocument();
  });

  it('renders the analytics inventory', () => {
    renderPage();
    expect(screen.getByText('_ga')).toBeInTheDocument();
  });

  // Art. 20. Representative of the rights added alongside it — restriction
  // (Art. 18) and objection (Art. 21) — which a rights list is incomplete
  // without and which nothing else on the page mentions.
  it('offers the right to data portability', () => {
    renderPage();
    expect(screen.getByText(/data portability/)).toBeInTheDocument();
  });

  // Art. 7(3): withdrawal is prospective. Without the sentence the notice
  // reads as if withdrawing undid processing already done under consent.
  it('says withdrawal does not unwind past processing', () => {
    renderPage();
    expect(screen.getByText(/does not affect the lawfulness/)).toBeInTheDocument();
  });

  // Art. 13(1)(c): Vercel logs IPs to serve the site at all, and it happens
  // whether or not anyone consents to anything — so it needs its own basis.
  it('discloses hosting as a legitimate interest', () => {
    renderPage();
    expect(screen.getByText(/processes IP addresses in server logs/)).toBeInTheDocument();
  });

  it('discloses blog comments and that approval publishes them', () => {
    renderPage();
    expect(screen.getByText(/shown publicly once approved/)).toBeInTheDocument();
  });

  it('promises the commenter email is never published', () => {
    renderPage();
    expect(screen.getByText(/never published/)).toBeInTheDocument();
  });

  it('covers the comment form under bot protection', () => {
    renderPage();
    expect(screen.getByText(/contact, newsletter, and comment forms/)).toBeInTheDocument();
  });

  it('states the comment retention policy', () => {
    renderPage();
    expect(screen.getByText(/Comments stay published until/)).toBeInTheDocument();
  });
});
