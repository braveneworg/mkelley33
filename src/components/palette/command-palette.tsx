/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import { motion, useReducedMotion } from 'motion/react';
import { useTheme } from 'next-themes';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { siteConfig } from '@/lib/site-config';

interface SearchResult {
  slug: string;
  title: string;
}

const PAGES = [
  { href: '/', label: './home' },
  { href: '/blog', label: './blog' },
  { href: '/services', label: './services' },
  { href: '/cv', label: './cv' },
  { href: '/uses', label: './uses' },
  { href: '/contact', label: './contact' },
] as const;

const ITEM_CLASSES =
  'flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-fg data-[selected=true]:bg-canvas data-[selected=true]:text-phosphor';

const PostResults = ({
  onNavigate,
  query,
}: {
  onNavigate: (href: string) => void;
  query: string;
}) => {
  const { data } = useQuery({
    enabled: query.trim().length >= 2,
    queryFn: async (): Promise<SearchResult[]> => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (!response.ok) {
        return [];
      }
      const json = (await response.json()) as { results: SearchResult[] };
      return json.results;
    },
    queryKey: ['search', query.trim()],
  });
  if (!data || data.length === 0) {
    return null;
  }
  return (
    <Command.Group heading="posts">
      {data.map((post) => (
        <Command.Item
          className={ITEM_CLASSES}
          key={post.slug}
          onSelect={() => onNavigate(`/blog/${post.slug}`)}
          value={post.title}
        >
          {post.title}
        </Command.Item>
      ))}
    </Command.Group>
  );
};

const PaletteDialog = () => {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    const onOpenEvent = () => {
      setOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('palette:open', onOpenEvent);
    // Hand off from the pre-hydration inline hotkey bridge (see
    // palette-hotkey.tsx): with the listeners attached, announce readiness
    // so a press buffered before this chunk hydrated replays as an open.
    window.dispatchEvent(new Event('palette:ready'));
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('palette:open', onOpenEvent);
    };
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  const openExternal = (url: string) => {
    setOpen(false);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const socials = [
    { label: 'github', url: siteConfig.socials.github },
    { label: 'linkedin', url: siteConfig.socials.linkedin },
    ...(siteConfig.socials.bluesky ? [{ label: 'bluesky', url: siteConfig.socials.bluesky }] : []),
  ];

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent aria-describedby={undefined} className="top-[20%] max-w-lg translate-y-0 p-2">
        <DialogTitle className="sr-only">command palette</DialogTitle>
        <motion.div
          animate={reduced ? undefined : { opacity: 1, scale: 1 }}
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          transition={{ bounce: 0.25, duration: 0.25, type: 'spring' }}
        >
          <Command
            className="[&_[cmdk-group-heading]]:text-fg-muted font-mono text-sm [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs"
            label="command palette"
          >
            {/* No autoFocus attribute: Radix moves focus into the dialog
                content on open, and the input is its first focusable child,
                so the palette is typeable immediately without the page-load
                focus-stealing that jsx-a11y/no-autofocus guards against.
                Covered by the "lands focus in the search input" spec. */}
            <Command.Input
              className="border-edge bg-canvas text-fg placeholder:text-fg-muted focus:border-phosphor w-full rounded border px-3 py-2 focus:outline-none"
              onValueChange={setQuery}
              placeholder="type a command or search…"
              value={query}
            />
            <Command.List className="mt-2 max-h-72 overflow-y-auto">
              <Command.Empty className="text-fg-muted px-3 py-6">
                <span aria-hidden="true"># </span>nothing found
              </Command.Empty>
              <Command.Group heading="pages">
                {PAGES.map((page) => (
                  <Command.Item
                    className={ITEM_CLASSES}
                    key={page.href}
                    onSelect={() => navigate(page.href)}
                    value={page.label}
                  >
                    {page.label}
                  </Command.Item>
                ))}
              </Command.Group>
              <PostResults onNavigate={navigate} query={query} />
              <Command.Group heading="links">
                {socials.map((social) => (
                  <Command.Item
                    className={ITEM_CLASSES}
                    key={social.label}
                    onSelect={() => openExternal(social.url)}
                    value={social.label}
                  >
                    {social.label} ↗
                  </Command.Item>
                ))}
                <Command.Item
                  className={ITEM_CLASSES}
                  onSelect={() => openExternal('/feed.xml')}
                  value="rss"
                >
                  rss ↗
                </Command.Item>
              </Command.Group>
              <Command.Group heading="theme">
                <Command.Item
                  className={ITEM_CLASSES}
                  onSelect={() => {
                    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                    setOpen(false);
                  }}
                  value="toggle theme"
                >
                  toggle theme ◐
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export const CommandPalette = () => {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <PaletteDialog />
    </QueryClientProvider>
  );
};
