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
    // Anchored: '## who receives it' is also a level-2 heading matching /who/.
    expect(screen.getByRole('heading', { level: 2, name: /^who$/ })).toBeInTheDocument();
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
});
