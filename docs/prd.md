# Product Requirement Document (PRD)
## BigQuery Release Insights (Release Viewer)

### Document Metadata
* **Title:** BigQuery Release Insights PRD
* **Status:** Draft / Inferred from Reference Implementation
* **Date:** 2026-06-30
* **Author:** Antigravity AI

---

### 1. Executive Summary & Product Overview

#### 1.1 Product Definition
**BigQuery Release Insights** is an interactive, dark-themed, glassmorphic dashboard that aggregates, parses, categorizes, and displays Google BigQuery release notes. It provides developers, data engineers, analysts, and database administrators with a centralized, searchable, and filterable feed of the latest updates, feature announcements, bug fixes, and deprecations.

#### 1.2 Problem Statement
Google Cloud Platform publishes official release notes as a raw XML feed and web documentation. However:
1. The official documentation can be text-heavy and challenging to filter by specific update types (e.g., only new features or only deprecated features).
2. It lacks built-in real-time search functionality.
3. Sharing specific updates (such as on social media platform X/Twitter) requires manual copying, formatting, and link attachment, which introduces friction for developer advocates and community members.

#### 1.3 Value Proposition
By parsing and categorizing the official XML feed in real-time, this application offers:
* **Enhanced Readability:** Grouped chronologically by date in a clean, modern card-based interface.
* **Instant Filtering & Search:** Real-time client-side search and classification filters (All, Features, Changes, Deprecated).
* **Social Sharing Integration:** A slide-out tweet composer drawer that pre-formats release notes into a shareable tweet structure, including a character counter and deep links, and facilitates direct publishing via Twitter Web Intent.

---

### 2. User Personas

| Persona | Role | Primary Goal | Paint Point Solved |
| :--- | :--- | :--- | :--- |
| **Data Engineer** | Technical / Ops | Track changes to BigQuery SQL syntax, performance improvements, and deprecation schedules to keep pipelines functional. | Finds out about deprecations immediately without parsing large pages of generic GCP updates. |
| **Developer Advocate** | Community / Marketing | Share key updates and cool new BigQuery features with the developer community on social media. | Slide-out tweet drawer pre-drafts and formats the update, eliminating copy-paste friction. |
| **Business Analyst** | Consumer / Analytical | Understand new capabilities of BigQuery (e.g., new functions, regional availability) to improve queries. | Real-time search allows searching for specific keywords (e.g., "JSON", "partitioning"). |

---

### 3. Key Feature Specifications

#### 3.1 RSS/XML Feed Integration & Backend Parser
* **Data Source:** Fetches from official URL: `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`.
* **XML Processing:**
  * Clean XML namespaces from the feed to simplify tag traversal using ElementTree.
  * Extract metadata: Unique update ID (`<id>`), Date/Time (`<updated>`), Reference Link (`<link href="...">`), and Content Body (`<content>`).
* **Category Parsing logic:**
  * Sub-parse content containing `<h3>` headings.
  * Categorize sub-sections based on header keywords:
    * **Features:** Keywords like `feature`, `new`.
    * **Changes:** Keywords like `changed`, `change`, `fix`.
    * **Deprecated:** Keywords like `deprecated`.
  * Fallback to general `update` type if no subheadings exist.

#### 3.2 Main Interactive Dashboard UI
* **Sidebar Layout:**
  * Brand Identity Logo & Text ("BigQuery Release Insights").
  * **Search Box:** Instant text input searching across titles, plain text content, and category names.
  * **Category Navigation Tab Buttons:**
    * *All Updates:* Show full list.
    * *Features:* Filters updates classified under features.
    * *Changes:* Filters updates classified under changes/fixes.
    * *Deprecated:* Filters updates classified under deprecations.
  * Sidebar Footer indicating automated synchronization from GCP.
* **Feed Area:**
  * **Header:** Displays sync status (e.g., "Last synced: 8:15:30 PM") and a manual "Refresh" button.
  * **Manual Refresh Interaction:** Spinning animation during retrieval; fetches new records from backend without full page reloading.
  * **Loading Shimmers:** Placeholders indicating active background fetching.
  * **Empty State:** Clean fallback display if search queries or filters yield zero results.
  * **Error State:** Fallback display with retry actions if backend feed fetch fails.

#### 3.3 Release Update Cards
* **Grouping:** Chronologically grouped by date with a side timeline indicator and a link pointing back to the official Google Cloud documentation.
* **Badges:** Visual indicators showing classification:
  * `Features` (Green star badge)
  * `Changes` (Yellow exclamation badge)
  * `Deprecated` (Red ban badge)
* **Card Selection & Interaction:** Clicking anywhere on the card highlights it and opens/populates the Tweet composer drawer.

#### 3.4 Tweet Composer Drawer (X/Twitter Integration)
* **Visual Presentation:** Slide-out side drawer overlaid on the workspace.
* **Automatic Formatting:** Draft text is auto-populated with:
  * Release title/date.
  * Truncated summary of the update description (capped at 160 characters followed by `...`).
  * Deep link pointing to the official GCP release page.
* **Character Counter:** Real-time display showing character length against a limit of 280 characters. Highlights counter in red if length exceeds limit.
* **Publishing Mechanism:** Integrates with `https://twitter.com/intent/tweet` to open a new tab containing the drafted text.

---

### 4. Technical Architecture

#### 4.1 Technology Stack
* **Backend:** Python + Flask micro-framework.
* **Frontend:**
  * HTML5 (Semantic tags).
  * Vanilla CSS3 (Custom design system variables, glassmorphic effects, flexbox/grid layout, responsive breakpoints).
  * Vanilla JavaScript (ES6+, asynchronous APIs, client-side DOM manipulation).
  * Iconography: FontAwesome v6.4.0.
  * Fonts: Google Fonts (Outfit, Plus Jakarta Sans).

#### 4.2 API Endpoints
* **`GET /`**: Renders the main static/HTML index page.
* **`GET /api/releases`**:
  * Action: Proxies request to GCP release XML endpoint, parses response, and transforms XML items into structured JSON.
  * Response Format:
    ```json
    {
      "status": "success",
      "entries": [
        {
          "id": "tag:google.com,2026:...",
          "title": "June 25, 2026",
          "updated": "2026-06-25T12:00:00Z",
          "link": "https://cloud.google.com/bigquery/docs/release-notes",
          "content": "HTML formatted release body..."
        }
      ]
    }
    ```

---

### 5. UI/UX Design Requirements

* **Theme:** Deep-space dark mode theme.
* **Color System:**
  * App Background: `#0b0f19`
  * Sidebar Background: `#0f1626`
  * Glassmorphic Cards: `rgba(22, 33, 54, 0.6)` with white border opacity `0.08` and blur effect.
  * Accent/Focus Color: `#38bdf8` (sky blue) with glow effects.
  * Status Badge Colors: Green (`#34d399`), Yellow (`#fbbf24`), Red (`#f87171`).
* **Animations:**
  * Sidebar sliding drawer (transform transition).
  * Rotate refresh icon during background synchronization.
  * Micro-interactions (hover scale, shadow glows) on buttons and cards.

---

### 6. Non-Functional Requirements

* **Performance:** Real-time client-side filter and search must run instantly with zero perceived lag (filtering should take < 50ms for typical feed volumes of ~100 items).
* **Usability:** Responsive viewports down to 320px mobile width. Mobile layout should stack the sidebar on top or hide it under a hamburger menu.
* **Reliability:** Graceful error handling if GCP RSS feed is offline or rate-limiting requests. Use a 10-second request timeout.
