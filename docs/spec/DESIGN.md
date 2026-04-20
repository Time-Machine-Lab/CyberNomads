# Design System Specification: The Neural Architect

## 1. Overview & Creative North Star
The "Neural Architect" is the creative North Star of this design system. It moves away from the static "dashboard" trope and toward a living, breathing command center for AI orchestration. This system is designed to feel like a high-end physical console—where data isn't just displayed, but "channeled."

To break the "template" look, we employ **Intentional Asymmetry** and **Tonal Depth**. We treat the screen as a void of infinite depth where AI-driven traffic flows. Instead of rigid grids, we use overlapping glass panels and high-contrast typography scales to create a sense of professional authority and futuristic precision. This is an environment for experts who operate at the intersection of human strategy and machine speed.

---

## 2. Colors: The Void and The Pulse
The palette is anchored in absolute blacks and deep charcoals to minimize eye strain while allowing the accent "pulses" to command attention.

### Surface Hierarchy & Nesting
We define depth through **Tonal Layering** rather than structural lines.
- **Base Layer:** `surface` (#0e0e0e) — The infinite background.
- **Structural Panels:** `surface-container-low` (#131313) — Primary navigation or sidebar containers.
- **Content Blocks:** `surface-container` (#1a1919) — Main workspace areas.
- **Active Elements:** `surface-container-highest` (#262626) — Floating cards or active modal states.

### The Rules of Engagement
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background color shifts. A `surface-container-low` card sitting on a `surface` background creates a clean, sophisticated edge without visual clutter.
*   **The "Glass & Gradient" Rule:** To provide visual "soul," main CTAs and floating orchestration panels must use glassmorphism. Utilize semi-transparent surface colors with a `20px` backdrop blur.
*   **Signature Textures:** Main actions should utilize a subtle linear gradient transitioning from `primary` (#8ff5ff) to `primary-container` (#00eefc) at a 135-degree angle. This provides a "lit-from-within" tech feel.

---

## 3. Typography: Precision & Utility
The typography system pairs the technical edge of **Space Grotesk** with the Swiss-style clarity of **Inter**.

*   **Display & Headlines (Space Grotesk):** Used for data visualization titles and high-level platform status. Its geometric construction feels engineered and futuristic.
    *   `display-lg`: 3.5rem — For hero metrics.
    *   `headline-md`: 1.75rem — For section headers.
*   **Interface & Technical Data (Inter):** Used for all functional UI and body copy.
    *   `title-sm`: 1rem — For card titles and input labels.
    *   `body-md`: 0.875rem — The workhorse for all descriptive text.
*   **Monospaced Technical Logs:** For system logs and node data, use a monospaced variant of Inter or a system mono font to ensure character alignment in high-density data streams.

---

## 4. Elevation & Depth
In this design system, height is an illusion created by light and transparency.

*   **The Layering Principle:** Depth is achieved by "stacking." Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural "recessed" look.
*   **Ambient Shadows:** When an element must "float" (like a context menu), use an extra-diffused shadow: `0px 24px 48px rgba(0, 0, 0, 0.5)`. The shadow should feel like a natural falloff of light, not a dark smudge.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility on a node or input, use the `outline-variant` (#484847) at **20% opacity**. Never use 100% opaque borders.
*   **Glow States:** Active nodes or "Running" states should utilize a subtle outer glow using the `primary` or `secondary` token with a `12px` blur at 30% opacity to simulate a powered-on LED.

---

## 5. Components

### Buttons: The Kinetic Core
*   **Primary:** Background: `primary` (#8ff5ff), Text: `on_primary` (#005d63). No border. On hover, apply a `primary-container` glow.
*   **Secondary:** Background: `secondary` (#c3f400), Text: `on_secondary` (#455900). For growth/traffic generation actions.
*   **Tertiary:** Transparent background, `outline` text. Only shows a `surface-container-high` background on hover.

### The Visual Task Graph (Nodes)
*   **Node Body:** `surface-container-highest` with a 20% `outline-variant` Ghost Border.
*   **Connectors:** Use sleek, 2px curved paths. 
    *   *Inactive:* `outline-variant`.
    *   *Active Flow:* A gradient stroke from `primary` to `tertiary` (#65afff) with a "marching ants" animation effect for data transmission.
*   **Ports:** Small circles using `primary-fixed-dim` for input/output points.

### Input Fields
*   **Style:** Minimalist. No background fill, only a bottom stroke using `outline-variant`.
*   **Focus State:** The bottom stroke transforms into a `primary` color with a subtle `primary-dim` shadow.
*   **Error State:** Text and underline switch to `error` (#ff716c).

### Cards & Lists
*   **Rule:** Forbid the use of divider lines. Separate content using vertical white space (use the 24px or 32px spacing increments) or by nesting a `surface-container-low` list item inside a `surface-container` card.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts (e.g., a wide data panel next to a narrow control strip) to create a premium, custom feel.
*   **Do** use `secondary` (#c3f400) sparingly as a "high-energy" highlight for conversion-related metrics.
*   **Do** embrace negative space. High-end systems feel premium because they aren't crowded.

### Don't
*   **Don't** use pure white (#ffffff) for large blocks of text; use `on_surface_variant` (#adaaaa) for secondary information to maintain the dark-mode atmosphere.
*   **Don't** use standard "drop shadows." Use tonal shifts and ghost borders.
*   **Don't** use rounded corners larger than `xl` (0.75rem) for main panels; keep them crisp (`md` or `lg`) to maintain the professional "Command Center" vibe.