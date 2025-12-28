# VisceralCommand Design Brief

## Core Philosophy

This app should feel like a **command center**, not a lifestyle app. Think Bloomberg terminal meets fitness tracker. Every pixel should earn its place.

## What We Value

### Information Density
- Vertical space is precious. No decorative headers or subheadings.
- If data can be shown inline, show it inline.
- Combine related info into single components (icon + number + label in one row).

### Minimalism with Purpose
- Icons alone, no colored circular backgrounds (unless it's an action button).
- Thin typography (fontWeight 200) for large numbers - feels modern and light.
- Remove labels when the context is obvious (a timer icon next to "14:32" doesn't need "Fasting" spelled out).

### Subtle Visual Hierarchy
- Use color sparingly and meaningfully (blue for fasting, green for eating/protein, orange for streaks).
- Thin colored borders on cards hint at meaning without shouting.
- Progress bars are thin (6px) and unobtrusive.

### Touch Targets & Feedback
- Interactive elements should be obviously tappable.
- Press states: slight opacity drop + subtle scale (0.98).
- Grid layouts for scannable, tappable items (2x2 supplements, 3-column meals).

## What We Avoid

- Decorative elements that don't convey information
- Redundant labels (if there's an icon, you probably don't need text saying what it is)
- Heavy containers or backgrounds around icons
- Large headers with subtitle text
- Percentage displays when a progress bar already shows it
- Anything that feels like a "wellness app" - this is a protocol enforcer

## Layout Patterns

- **Banner style**: Icon on left, big number + label stacked, optional badge on right
- **Card grids**: Equal-sized tappable cells, 2-3 columns depending on content
- **Compact lists**: Horizontal chip-style for small items, vertical cards for detail

## Component Patterns

### Page Headers
Icon + thin text title, aligned left. Keep it lightweight and consistent across screens.
- Icon matches the tab bar icon for that section (e.g., Utensils for Food)
- Title uses thin font weight (200) at `fontSize.xl`
- Icon and text in a horizontal row with small gap
- Settings or action buttons aligned right if needed
- No decorative subtitles or descriptions

Example: `[Utensils icon] Food` with settings gear on the right.

### Tabs
Underline indicator, not filled backgrounds. Icon + label, dim when inactive, bright when active. The active state is communicated through a subtle bottom border—no need for heavy color fills that compete with content.

### Secondary Actions
Dashed borders for "add" or "log" CTAs (e.g., "Log food", "Add food to this entry"). These invite action without demanding it. The dashed style signals "optional, but here if you need it" rather than a primary action. Use accent color at low opacity for the border, accent color for text/icon.

## Color Usage

- Dark slate backgrounds (#0f172a, #1e293b)
- Accent colors have meaning:
  - Orange: streaks, fire, motivation
  - Blue: fasting, time-based
  - Green: eating, protein, completion
  - Purple: supplements, secondary actions
- Use color at 20% opacity for subtle tints, full color for icons/text

## Typography

- Large display numbers: thin weight, tabular nums
- Labels: small, uppercase, letter-spaced, muted color
- Body: medium weight, high contrast

## Navigation

- Slide transitions for drilling into detail views
- Minimal back buttons (circular, icon only)
- Tab bar stays visible and grounded
