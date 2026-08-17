# Lindio demo scenario

This document defines the canonical synthetic state used for portfolio screenshots, guided reviews and engineering interviews.

The scenario contains no customer, production or commercially validated data. People, businesses, phone numbers, email addresses, values, requests and outcomes are fictional demonstration data.

## Purpose

The demo should communicate Lindio's operational workflow without requiring a reviewer to provision Supabase, create an account or start from an empty workspace.

The browser-local demo intentionally includes a small set of requests at different commercial stages so the Today, Requests and Report views remain meaningful.

## Built-in synthetic workspace

`src/data/mockLeads.js` builds the demo dataset relative to the current browser date. This keeps follow-up semantics meaningful whenever the demo is opened.

The canonical built-in requests are:

### 1. Maria Leone

- Channel: WhatsApp
- Service: post-renovation cleaning
- Location: Potenza
- Status: `Da rispondere`
- Priority: high
- Follow-up: today

Purpose:

- surface an enquiry that still needs a first operational response;
- contribute to the Today queue;
- demonstrate an urgent private-customer request.

### 2. Antonio Rinaldi

- Channel: phone
- Service: recurring B&B cleaning
- Location: Muro Lucano
- Status: `Sopralluogo da fissare`
- Follow-up: today

Purpose:

- show a service-business lead that requires a site visit;
- demonstrate that Lindio models the next operational action rather than only a sales stage.

### 3. Studio Tecnico Greco

- Channel: email
- Service: recurring office cleaning
- Location: Potenza
- Status: `Preventivo da preparare`
- Follow-up: tomorrow

Purpose:

- populate quote preparation work;
- show a recurring B2B-style request.

### 4. Condominio Via Roma 18

- Channel: Facebook
- Service: condominium common-area cleaning
- Location: Roma
- Status: `Preventivo inviato`
- Next action: follow-up

Purpose:

- represent a quote already sent;
- demonstrate that sending a quote does not end the operational workflow.

### 5. Elena Caruso

- Channel: Instagram
- Service: apartment cleaning
- Location: Avigliano
- Status: `Info richieste`
- Follow-up: today

Purpose:

- expose a request that cannot progress until missing information arrives;
- demonstrate incomplete-intake handling.

### 6. Palestra Active Tito

- Channel: website/form
- Service: sanitisation
- Location: Tito
- Status: `In attesa`

Purpose:

- represent a request waiting on an external response;
- diversify acquisition channels and service types.

### 7. Bar Centrale Picerno

- Channel: WhatsApp
- Service: commercial-premises cleaning
- Location: Picerno
- Status: `Vinta`

Purpose:

- provide one synthetic won request;
- make closed-work reporting non-empty.

### 8. Lucia Martino

- Channel: other
- Service: window cleaning
- Location: Ruoti
- Status: `Persa`

Purpose:

- provide one synthetic lost request;
- keep conversion/reporting examples balanced rather than showing only successful outcomes.

## Capture-only request

`npm run demo:capture` creates one additional synthetic request through the real browser UI in each fresh Playwright context.

Customer: **Giulia Bianchi**

Message:

> Ciao, mi chiamo Giulia Bianchi. Ho bisogno di una pulizia post ristrutturazione per un appartamento vuoto di 80 mq a Roma domani. È al secondo piano con ascensore e posso inviare foto. Vorrei un preventivo. Il mio numero è 333 123 4567.

The capture flow:

1. opens the explicit local demo;
2. enters the message in the real request form;
3. runs the deterministic local intake analyzer;
4. captures the analyzer review state;
5. applies the suggestions manually;
6. saves the request through the normal demo persistence path;
7. captures the resulting request detail;
8. captures Today, Requests and Report with the same resulting scenario.

The mobile context repeats the same browser workflow before capturing its views. Desktop and mobile screenshots therefore represent equivalent synthetic product states.

## Screenshot contract

The repository portfolio screenshots are generated with Playwright using:

- production `vite build` output served through `vite preview`;
- desktop viewport: `1440 × 1000`;
- mobile viewport: `390 × 844`;
- locale: `it-IT`;
- timezone: `Europe/Rome`;
- reduced motion;
- disabled screenshot animations;
- JPEG quality: 88;
- a fresh browser context with no real credentials;
- service workers blocked during capture to avoid stale local cache affecting visual evidence.

Generated files:

```text
docs/assets/demo/
├── login-desktop.jpg
├── today-desktop.jpg
├── leads-desktop.jpg
├── intake-analysis-desktop.jpg
├── lead-detail-desktop.jpg
├── report-desktop.jpg
├── today-mobile.jpg
└── leads-mobile.jpg
```

## Reproduce the screenshots

Install Chromium once if it is not already available:

```bash
npx playwright install chromium
```

Then run:

```bash
npm run demo:capture
```

The default command builds the production application, serves the generated `dist` directory locally on `127.0.0.1:4183`, creates the synthetic scenario and writes all eight assets.

A remote HTTPS demo can be captured explicitly by setting `LINDIO_DEMO_BASE_URL`, but the default portfolio workflow deliberately does not depend on hosted credentials or a live Supabase project.

## Reviewer safety

- No real contact information is required.
- No external AI provider receives the customer message.
- No Supabase credentials are required for capture.
- No production database is mutated.
- Browser-local demo state is discarded with the Playwright context.
- Screenshot contents must continue to be described as synthetic portfolio data.
