# LETFISHFUCK — Mimi Marsh (Static portfolio)

This is a zero-build static site. Drop the folder into Netlify (or run locally).

## Structure

/
- index.html
- styles.css
- script.js
- netlify.toml
- PORTFOLIO.pdf                (root copy is canonical)
/assets
  - hero.jpg                   (optional)
  - PORTFOLIO.pdf              (optional duplicate)
  - work-01.jpg / work-02.jpg  (images)
  - work-01.mp3 / work-02.mp3  (audio)
  - work-01.mp4                (video)
  - favicon.svg

/music
  - index.html                 (music-only gallery page)

/media
  - index.html                 (images/video gallery page)

## URLs (shortcuts)

- /work      -> /#work
- /about     -> /#about
- /contact   -> /#contact
- /music     -> /music/   (real page)
- /media     -> /media/   (real page)
- /pdf       -> /PORTFOLIO.pdf
- /.pdf      -> /PORTFOLIO.pdf

## Add new work fast (naming convention)

Put files in /assets using these patterns:
- Images: work-01.jpg, work-02.jpg, ...
- Audio:  work-01.mp3, work-02.mp3, ... (or .wav)
- Video:  work-01.mp4, work-02.mp4, ...
- PDF:    PORTFOLIO.pdf (root recommended)

The site will attempt to auto-detect common filenames and display anything it finds.

## Notes

- If iOS tries to save files as .txt or rich text, stop it. Use plain text editor mode.
- If GitHub upload fails (“file too large”), keep media in Netlify deploy, or shrink/compress.
