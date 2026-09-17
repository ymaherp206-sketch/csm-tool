# Contractors Scaled — website

Static site. No build step. Upload the contents of this folder to any host
(Netlify, Cloudflare Pages, GitHub Pages, cPanel, S3, whatever).

```
index.html        main page
thank-you.html    post-submit page (used when JavaScript is off)
css/site.css      all styles
js/site.js        all behaviour (progressive enhancement only)
images/           put kitchen.jpg, bathroom.jpg, basement.jpg, pool.jpg here
favicon.svg
robots.txt
```

## Contact form

Posts to FormSubmit at `joseph@contractorscaled.com`.

- With JavaScript on, the form submits via FormSubmit's AJAX endpoint and shows
  an inline confirmation without leaving the page.
- With JavaScript off, it posts normally and redirects to `_next`, which is
  hard-coded to `https://contractorscaled.com/thank-you.html`. Change that
  value in `index.html` if the site lives on a different domain. When JS is
  on, it is rewritten to match wherever the page is hosted.
- The first submission from a new domain triggers FormSubmit's one-time
  activation email to `joseph@contractorscaled.com`. Click the link once.
- `_captcha` is set to `false` and a honeypot field (`_honey`) is used instead.
  Flip `_captcha` to `true` if spam becomes a problem.

Fields sent: `I am a` (Homeowner / Contractor), `Name`, `Phone`, `Email`,
`Location`, `Project type`, `Message`.

## Editing

Colours, type scale, and spacing are CSS custom properties at the top of
`css/site.css`. Copy lives in `index.html`; there is no templating.
