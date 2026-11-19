# Vice Cover Studio

[![Competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/rifanrstu/gta6-cover-art-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/rifanrstu/gta6-cover-art-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your own photos and a caption into GTA-style
multi-panel poster cover art with a Vice City sunset / neon colour grade,
exported as a PNG in the common post sizes. Built for the make.fun bounty
[gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Multi-panel layouts** — Hero Grid, Nine Panel Grid with a halftone title
  band, Duo Split, Trio Columns, Full Bleed Hero and Tilted Snapshots.
- **Any photo** — load photos from your machine (they never leave it), spread
  one photo across every panel or a different photo per panel, then click a
  panel and drag / zoom / slider-crop it into place.
- **Five colour grades** — Vice Sunset, Neon Night, Golden Hour, Ink Mono and
  Candy Pop, each a filter pass plus a gradient wash, with film grain, a
  vignette and inked panel borders.
- **Poster lettering** — gradient headline caption, neon script subtitle,
  heat-star meter and a badge ribbon, all drawn by the app itself. No
  third-party logos, artwork or fonts.
- **Fast export** — one click to a PNG at 1080 x 1080, 1080 x 1350 or
  1920 x 1080 (plus a 1080 x 1920 story size), or export the three post sizes
  at once. Undo / redo included.

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

Open the page, drop in photos, pick a layout and grade, write your caption,
export. No build step and no network: every file the app loads lives under
`app/`.

## Hand-in program

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with `buildDossier` from
`vendor/makefun-app.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`. The two sample photos under `app/samples/` were made
with an image model for make.fun and are free to use.
