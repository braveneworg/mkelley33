# A block of its own wraps onto the next line, whatever comes before it

**Symptom:** the arrow after a link that leaves the site (2026-11-25) was an
`inline-block`, so that the link's underline would stop at the words. A word
joiner (U+2060) was put in front of it to keep it on the line of the word it
follows. Every spec passed. The first screenshot at a phone's width showed
"Fake Four Records" at the end of one line and the arrow alone at the start
of the next.

The same screenshot was 609 pixels wide for a 360 pixel screen: an address
used as a link's own words has no place to break, and it pushed the whole
Page sideways.

**Root cause:** a browser treats an `inline-block` as one unbreakable object
and allows a line break on either side of it. The characters next to it do
not get a say — a word joiner or a no-break space stops a break between two
characters, not between a character and a box. What does stop it is
`white-space: nowrap` on an element that holds both the joiner and the box:
then the break between them is forbidden by the element, and the break
between the last word and the joiner is forbidden by the joiner.

Nothing automated could see either fault. jsdom lays nothing out, so a
component spec can say the arrow is there and cannot say where.

**Rule:**

- To pin a box to the word before it: a word joiner, then the box, both
  inside one `whitespace-nowrap` element (`SiteAnchor` in
  `src/components/blocks/site-link.tsx`). Neither half works alone.
- Text the owner can put an address into gets `wrap-anywhere`. A link's
  words are often the address itself.
- A change to how text is laid out is looked at in a real browser at a
  phone's width before it is called done — several widths, because a wrap
  fault shows only where the line happens to end. Ask the page for
  `document.documentElement.scrollWidth` at each: wider than the screen
  means something is pushing it.
- The Seed's CV has no links, so the look needs some: add them to
  `seed/pages.json` for the run, with a throwaway spec that takes the
  screenshots through `pnpm e2e`, and put both back before committing.

**History:** 2026-11-25, links in the CV. Found by the first screenshots,
before the branch was pushed. See
[a-scroll-reveal-hides-what-it-wraps-until-it-fires](a-scroll-reveal-hides-what-it-wraps-until-it-fires.md)
for the first time screenshots found what the suite could not.
