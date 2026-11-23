# A scroll reveal hides what it wraps until it fires

**Symptom:** PR 3 of the page builder (2026-11-23) gave every Block one
frame, `BlockSection`, taken from the home page's section component — which
wraps its content in `Reveal`. The unit suite, the gate, the production
build and the E2E suite were all green. Full-page screenshots showed every
Page as a heading above a blank column: the CV, the uses lists, the contact
form were all in the document and all at `opacity: 0`.

**Root cause:** `Reveal` renders its children invisible and shows them when
a share of the wrapper — 20% of its height — has scrolled into view. On the
home page that had only ever wrapped short sections. As the default wrapper
for any Block it covered things that must not wait:

- **Tall content.** A wrapper more than five screens high can never have
  20% of itself in view at once. The CV's work history would have stayed
  invisible for good.
- **Print.** Nothing below the fold has been scrolled to when a page is
  printed, so it prints blank.
- **The body of a Page.** A list or a form that fades in on scroll reads as
  broken, not as polished.

Nothing automated could see it. Testing Library's `toBeInTheDocument` and
Playwright's `toBeVisible` both pass for an element at `opacity: 0`.

**Rule:**

- An entrance animation is something a component opts into, never a
  property of a shared wrapper. `BlockSection` animates only a Block that
  has a command line — a section of its own — and renders everything else
  as it is.
- A reveal must trigger on "any of it is in view", not on a share of its
  height (`amount: 'some'` with a small margin), so that content of any
  height appears.
- After moving markup into a shared component, look at the page.
  Screenshots through the E2E harness — scrolled, and with
  `emulateMedia({ media: 'print' })` for anything that is printed — took
  three minutes and found what 1,700 passing tests could not.
- The same pass found the Hero's typewriter effect hard-coded to the eight
  characters of `$ whoami`. Making a value editable means looking for
  everything that was sized to its old content.

**History:** 2026-11-23, PR 3. Found before the branch was pushed, by
taking the screenshots instead of trusting the green suite.
