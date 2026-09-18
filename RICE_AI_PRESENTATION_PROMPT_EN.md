# Rice AI Platform — 7-Minute Presentation Generation Prompt

Copy the prompt below into Gamma, Canva, PowerPoint Copilot, or another AI presentation generator. Replace the text inside square brackets before generating the deck.

---

## Prompt

Create a professional **9-slide presentation in English** about the **Rice AI Platform**, an intelligent decision-support web platform for Thai rice farmers.

### Presentation Context

- **Purpose:** University project presentation and technical demonstration
- **Audience:** Lecturers, project evaluators, students, and agricultural technology stakeholders
- **Maximum speaking time:** 7 minutes
- **Target speaking time:** 6 minutes 10 seconds, leaving approximately 50 seconds as a safety buffer
- **Aspect ratio:** 16:9 widescreen
- **Presenter:** [PRESENTER NAME]
- **Institution / Program:** [INSTITUTION OR PROGRAM]
- **Date:** [DATE]
- **Project maturity:** Working MVP Beta; not yet production-ready

### Communication Goal

By the end of the presentation, the audience should understand the agricultural problems addressed by Rice AI Platform, see how its main modules work together, recognize the current MVP achievements, and understand the next steps required before production use.

### Core Message

Rice AI Platform combines rice disease screening, agricultural weather intelligence, yield analytics, farm finance, trusted information, and AI assistance in one accessible platform to support clearer and more data-informed farming decisions.

### Visual Direction

- Match the existing Rice AI Platform brand and interface.
- Use deep green, soft cream, white, muted gold, and light mint accents.
- Use the existing Rice AI Platform logo.
- Prefer real screenshots from the current web application.
- Use large visuals, short text, generous spacing, and simple line icons.
- Keep each slide focused on one clear message.
- Do not create dense dashboard-like slide layouts with many small cards.
- Ensure all visible slide content and speaker notes are in English.
- Do not place timing labels on the visible slides; timings belong only in the speaker notes.

## Slide-by-Slide Structure

### Slide 1 — Rice AI Platform

**Target speaking time: 15 seconds**

**Title:** Rice AI Platform  
**Subtitle:** Intelligent Decision Support for Thai Rice Farmers  
**Footer:** [PRESENTER NAME] · [INSTITUTION OR PROGRAM]

Use a minimal title slide with the logo and one strong product screenshot or a subtle rice-field background.

Speaker-note focus: Introduce the project in one sentence and state that it brings essential rice-farming decisions into one platform.

### Slide 2 — Farmers Still Work with Fragmented Information

**Target speaking time: 40 seconds**

Show four concise problems:

- Rice diseases can be difficult to identify early.
- Weather data rarely explains what farmers should do next.
- Provincial yield and environmental data are difficult to explore.
- Income and expenses are often recorded inconsistently.

End with one short statement: **Farmers need practical guidance, not more disconnected data.**

Visual: one farmer-centered visual with four surrounding problem icons. Avoid long paragraphs.

### Slide 3 — One Platform Connects the Farmer’s Decisions

**Target speaking time: 40 seconds**

Show this user journey:

**Observe → Diagnose → Decide → Record → Review**

Connect the journey to six capabilities:

- Agricultural Weather
- AI Disease Screening
- Rice AI Assistant
- Farm Finance
- Yield Analytics
- News, Alerts, and Admin Content

Visual: use a simple horizontal journey with a main dashboard screenshot. Keep descriptions to short labels only.

### Slide 4 — AI Screens Rice Disease Images in Two Stages

**Target speaking time: 50 seconds**

Explain the workflow:

1. The user uploads a rice image from a phone or computer.
2. A binary model checks whether the image is related to rice.
3. A fine-tuned ResNet50 model classifies six supported outcomes.
4. The system shows confidence, class probabilities, initial care guidance, and user history.

Supported outcomes: Healthy Leaf, Sheath Blight, Bacterial Leaf Blight, Brown Spot, Rice Blast, and Neck Blast.

Add a visible disclaimer: **Preliminary AI screening — confirm treatment decisions with an agricultural expert.**

Visual: upload interface on the left, a compact two-stage model flow in the center, and the prediction result on the right.

Do not claim a model accuracy because the independent evaluation report is not yet available.

### Slide 5 — Local Weather Becomes Practical Field Action

**Target speaking time: 50 seconds**

Highlight:

- GPS and real-place search in Thailand
- Open-Meteo data based on selected coordinates
- Current, hourly, and seven-day forecasts
- Rain, humidity, wind, soil moisture, and ET0
- Field recommendations for irrigation, disease scouting, spraying, and harvesting
- Weather-risk information in the notification center

Visual: use one large agricultural weather screenshot and a small flow: **Location → Weather Data → Field Recommendation**.

### Slide 6 — Yield Analytics Makes 77 Provinces Explorable

**Target speaking time: 45 seconds**

Show the analytics scope:

- Actual rice-yield history from 2011–2024
- Retrospective model predictions for 2023–2024
- Monthly environmental data from 2011–2025
- Rainfall, temperature, NDVI, and soil-moisture indicators
- Interactive SVG map with click, zoom, and pan
- Province details and multi-province comparison

Mention that annual charts display every year and monthly charts display all 12 months.

Visual: one large 77-province map with one small annual chart and one small province-detail panel. Keep labels readable.

### Slide 7 — Supporting Tools Complete the Daily Workflow

**Target speaking time: 45 seconds**

Use three clear sections:

**Rice AI Assistant**

- Gemini-powered Thai-language agricultural guidance
- Server-side API access and safety reminders

**Farm Finance**

- Natural Thai income and expense entry
- Categories, budgets, accounts, recurring items, export, and weekly/monthly/yearly charts

**Content and Alerts**

- Separate admin portal for news, infographics, alerts, and recommendations
- Published content appears dynamically in the user application

Visual: use three screenshots with one short caption each. Do not add detailed feature lists beyond the points above.

### Slide 8 — The MVP Works End to End, but Trust Comes Next

**Target speaking time: 50 seconds**

Create a balanced two-column layout.

**Working MVP Beta**

- User and admin authentication
- Responsive web interfaces
- Disease, weather, yield, chatbot, finance, news, and notification workflows
- Supabase-backed user data and content

**Before Production**

- Rotate and audit secrets
- Patch vulnerable dependencies
- Add automated unit, integration, and end-to-end tests
- Deploy and monitor the web applications and FastAPI service
- Measure disease-model quality on independent and real-phone images

Add a small architecture strip at the bottom:

**Next.js 16 + React 19 → Supabase / Gemini / Open-Meteo → FastAPI + TensorFlow ResNet50**

Clearly label the system as **MVP Beta**, not production-ready.

### Slide 9 — The Next Priority Is a Trusted Field-Ready Platform

**Target speaking time: 35 seconds**

Show three roadmap steps:

1. **Secure and Test** — credentials, dependency updates, automated tests, privacy, backup, and recovery.
2. **Validate AI and Data** — independent model evaluation, real-phone testing, calibration, and reliable data pipelines.
3. **Deploy and Personalize** — production monitoring, saved locations, trusted-source RAG, realtime alerts, and opt-in web push.

Close with this statement:

**Rice AI Platform turns agricultural data into practical decisions — with trust, safety, and measurable quality as the next milestone.**

Visual: a simple three-step roadmap beside a clean collage of the disease, weather, yield, and finance modules. Do not add a separate “Thank You” slide.

## Speaker Notes and Timing Rules

- Write concise English speaker notes for every slide.
- Keep the total scripted speaking time between **5 minutes 50 seconds and 6 minutes 20 seconds**.
- Leave at least 40 seconds of buffer before the 7-minute limit.
- Use approximately 115–125 spoken words per minute.
- Do not exceed the target time assigned to each slide.
- Use natural transitions so the presentation sounds like one story rather than nine separate descriptions.
- Do not read every visible bullet word for word; the notes should explain the meaning of the visual.
- Put the planned duration at the beginning of each slide’s speaker notes, not on the visible slide.

## Content Accuracy Rules

- Do not invent model accuracy, precision, recall, F1-score, user counts, revenue, cost savings, adoption, field-trial results, or return on investment.
- Do not claim that the disease model provides a final diagnosis.
- Do not claim that the platform is deployed to production.
- Clearly separate implemented MVP features from future roadmap items.
- Describe 2023–2024 yield predictions as retrospective model results.
- Keep treatment recommendations conservative and include expert confirmation.
- Use only information provided in this prompt or verified project files.

## Writing and Output Rules

- Produce exactly **9 slides**.
- Keep all visible text and speaker notes in English.
- Use concise, natural language suitable for a university project presentation.
- Prefer one takeaway-style title and no more than four short visible points per slide where possible.
- Use at least 50 pt for the deck title, 35 pt for slide titles, 24 pt for subheadings, and 16 pt for body text.
- Keep diagrams, charts, and text editable.
- Use verified project screenshots and real interface flows.
- End with the product direction and next development priority.

---

## Suggested Project Assets

Use current screenshots from these application areas:

- Main dashboard
- Disease upload and prediction result
- Agricultural weather dashboard
- Rice-yield map and province detail
- Rice AI Assistant
- Farm finance dashboard
- News, notifications, and admin portal

Use these project files to verify facts:

- `PROJECT_STATUS_AND_ROADMAP_TH.md`
- `README.md`
- `RICE_YIELD_ANALYTICS_TH.md`
- `services/disease-ai/README.md`

