# Changelog

## Unreleased
- Fix slow matching on crafted input in the SECRET, HOST, EMAIL and DB_PASSWORD rules
- Move JSDoc types into `types/index.d.ts`; trim comments

## 1.2.0
- Use system fonts; no third-party assets shipped (`font-src 'none'`)
- Test that blocks font files, external URLs and key-shaped strings

## 1.1.0
- Lens and Sticker themes with a switcher
- Hover a label to peek at its value
- Category colours for labels and findings

## 1.0.0
- New UI with live highlighting and a findings table
- Azure, GitLab, npm and SendGrid detectors
- Linear-time detection (1 MB in well under a second)
- Request counter in the header

## 0.1.0
- First release
