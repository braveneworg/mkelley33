# mkelley33

The personal site of Michaux Kelley: who he is, what he offers, and what he
writes. The owner is the only person who edits it.

## Language

### Building pages

**Page**:
A document the owner creates, edits, and arranges in the admin, shown to
visitors at its own address. A Page is an ordered list of Blocks.
_Avoid_: route, screen, view

**Block**:
One section of a Page, chosen from the kinds the design system offers. The
owner decides which Blocks a Page has, their order, and what they say; a new
kind of Block is a code change.
_Avoid_: beat, section, component, widget

**Fixed Page**:
A Page the rest of the site depends on finding at a known address — home,
blog, privacy, contact, and services. Its Blocks are the owner's to edit, but
it cannot be moved or deleted, and unpublishing it does not take it off the
site: visitors keep the last published version.
_Avoid_: system page, core page

**Site settings**:
The single set of values every Page shares — the owner's identity, social
links, and the Resume.
_Avoid_: site config, globals

### Whose data it is

**Owner content**:
What the owner authors and shows to visitors — Pages, Site settings,
Services, Posts, pictures, and the Resume.
_Avoid_: site data, CMS data

**Visitor data**:
What visitors hand over privately — newsletter subscriptions, contact
messages, and the details attached to comments. It is never public.
_Avoid_: user data, production data

**Seed**:
The public starting set of Owner content that turns an empty site into the
working one. It never holds Visitor data or the owner's login.
_Avoid_: fixture, dump, snapshot

**Capture**:
Refreshing the Seed from what the live site currently publishes, so the Seed
reflects the owner's latest edits. Unpublished drafts are never captured.
_Avoid_: export, sync, dump

**Backup**:
A private, complete copy of the live site's data, Visitor data included,
kept by the owner and never published.
_Avoid_: seed, export

### The owner's history

**CV**:
The Page that presents the owner's professional history on the site.
_Avoid_: resume page

**Resume**:
The downloadable file of the owner's professional history, uploaded by the
owner. It is a separate artefact from the CV and is not generated from it.
_Avoid_: CV PDF
