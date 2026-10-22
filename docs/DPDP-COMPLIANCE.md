# DPDP compliance checklist

How Paste-Safe meets India's Digital Personal Data Protection Act, 2023 (DPDP Act) and the Digital Personal Data Protection Rules, 2025. Review this list whenever the site starts handling data in a new way.

This is an engineering checklist, not legal advice. Have a lawyer review it before relying on it.

## Position

Paste-Safe processes the text people paste **only in their own browser**. Nothing is sent to the maintainer or any server, and the page's Content Security Policy (`connect-src 'none'`) blocks network requests. The maintainer therefore does not collect or process visitors' personal data, and most Data Fiduciary duties have nothing to apply to. The notice still explains this, and the site still offers the controls a visitor would expect.

## Checklist

| Obligation | Where it comes from | Status | How |
| --- | --- | --- | --- |
| Notice in clear, plain language, listing the data and purpose | DPDP Act s.5; Rules, notice requirements | Done | [`privacy.html`](../privacy.html) lists every item kept on the device and why |
| Notice reachable from every page | Rules, notice requirements | Done | Footer link on every page |
| Consent before processing personal data | DPDP Act s.6 | Not needed today | Nothing is collected. The notice promises to ask before that changes |
| Purpose limitation and data minimisation | DPDP Act s.4–6 | Done | Only the word list and two settings are stored, on the device only |
| Storage limited to what the notice lists | DPDP Act s.8(7) | Enforced by test | `tests/unit/assets.test.mjs` fails if any code outside `src/ui/store.js` touches storage, or if the notice misses a stored key |
| Erasure on request | DPDP Act s.12 | Done | "Erase saved data" button on the privacy page; text is never stored |
| Access, correction, nomination | DPDP Act s.11, 12, 14 | Explained | The notice says what can be requested and that nothing is held |
| Grievance redressal, response within 90 days | DPDP Act s.13; Rules | Done | Contact routes and timelines in the notice, section 10 |
| Contact for questions about processing | DPDP Act s.8(9); Rules | **Partly done** | GitHub issues and private advisories. Add a direct email if you want one (see below) |
| Escalation to the Data Protection Board | DPDP Act s.13(3) | Done | Named in the notice |
| Reasonable security safeguards | DPDP Act s.8(5); Rules | Done | CSP, no third-party code or fonts, text inserted as text only, automated tests, CodeQL |
| Breach notification to Board and users | DPDP Act s.8(6); Rules | Process stated | Notice section 8; reports go through `SECURITY.md` |
| Children's data and parental consent | DPDP Act s.9 | Not applicable | No data collected from anyone; stated in the notice |
| Cross-border transfer | DPDP Act s.16 | Not applicable | No transfers by the maintainer; GitHub hosting is disclosed |
| Processors | DPDP Act s.8(2) | Disclosed | GitHub Pages hosting, under GitHub's privacy statement |
| Notice in Eighth Schedule languages on request | Rules | Offered | Notice section 11 |
| Terms of use, no-warranty disclaimer | Good practice; MIT License | Done | [`terms.html`](../terms.html) |

## Things the maintainer should decide

1. **A direct contact.** The notice points to GitHub. Many users expect an email for privacy requests. If you add one, put it in section 10 of `privacy.html` and in `SECURITY.md`.
2. **Legal review.** A short review by an Indian lawyer of `privacy.html` and `terms.html` is cheap insurance.
3. **Before adding anything that sends data** (analytics, error reporting, a sync server, a browser add-on that talks to a server): update the notice first, ask for consent where required, and update this checklist. The storage test will fail on new storage until the notice is updated.
