# Calendar Widget

A calendar widget for Grist based on [Toast UI Calendar](https://github.com/nhn/tui.calendar). Displays rows from a Grist table as calendar events with support for custom styling and assignee badges.

## Column Mappings

Configure these in the Creator Panel under **Widget → Columns**.

| Widget field | Required | Accepted types | Description |
|---|---|---|---|
| **Start Date** | Yes | Date, DateTime | Start of the event |
| **End Date** | No | Date, DateTime | End of the event (defaults to Start Date if omitted) |
| **Is All Day** | No | Bool | Whether the event spans the full day |
| **Title** | Yes | Text | Label shown on the event block |
| **Type** | No | Choice, ChoiceList | Controls event color/style using Grist choice colors |
| **Details** | No | Any (multiple) | Short fields shown below the title, one truncated line per column |
| **Description** | No | Text, Ref, RefList, Any (multiple) | Long-form fields shown below details, wraps up to 4 lines per column |
| **Initials** | No | Text, ChoiceList, Any | Initials to display as colored circles on the event |
| **Initials Color** | No | Text, ChoiceList, Any | Background colors for the initials circles (one per initial, same order) |
| **Status Emoji** | No | Text, Any | Emoji shown as a semi-transparent overlay on the event card (e.g. `✅`, `🚫`); empty = no overlay |
| **Priority** | No | Text, Any | Emoji shown in the bottom-left corner (e.g. `🔴`, `🟡`, `🟢`) |
| **Task Count** | No | Numeric, Integer, Text, Any | Number or label shown as a small badge in the bottom-right corner |

## Details (body lines)

The **Details** field accepts **multiple columns** — select as many as you want in the Creator Panel. Each mapped column appears as a separate line below the event title, in the order they were added.

Lines that don't fit within the event block height are automatically clipped by the calendar container. Shorter events (e.g. 30 min slots) will show fewer lines than longer ones.

Empty or null values are filtered out and take no space.

## Description (multi-line fields)

The **Description** field also accepts **multiple columns**. Each is rendered below the Detail lines with wrapping enabled, capped at **4 lines** per column via CSS `line-clamp`. Use this for longer text fields like notes or task descriptions.

The rendering order in the event block is: **Title + initials → Details (single-line) → Description (multi-line)**.

## Initials Badges

Each event can display one or more small colored circles in its top-right corner — useful for showing which person(s) are assigned to a task.

### Single assignee
Map a plain **Text** column containing the initials (e.g. `MC`) and another Text column with a CSS color (e.g. `#e74c3c`).

### Multiple assignees
Use **Any**-type formula columns that return a list:

```python
# In your tasks table, assuming an "assigned_to" Reference List column
# pointing to a "people" table with "initials" and "color" columns:

task_initials  = assigned_to.initials   # → ['MC', 'AB']
task_colors    = assigned_to.color      # → ['#e74c3c', '#3498db']
```

Set both formula columns to type **Any** in Grist, then map them to **Initials** and **Initials Color** in the Creator Panel. The circles are rendered in index order: `initials[0]` uses `colors[0]`, etc.

### Color format
Any valid CSS color is accepted: `#e74c3c`, `rgb(231, 76, 60)`, `red`, etc.

## Status Emoji Overlay

Map a **Text** or **Any** column to **Status Emoji**. When the cell contains an emoji (e.g. `✅` for done, `🚫` for blocked), that emoji is displayed centered over the full event card on a semi-transparent white overlay. This immediately signals the task state at a glance without hiding the underlying event details.

When the cell is empty, the card displays normally with no overlay.

**Tip:** Use a formula column with a simple mapping:

```python
# Example: return an emoji based on a "Status" choice column
{"Done": "✅", "Blocked": "🚫"}.get($Status, "")
```

## Event Type Styling

The **Type** field maps to a Grist **Choice** or **ChoiceList** column. The colors and font styles configured on each choice option in Grist (fill color, text color, bold, italic, underline, strikethrough) are applied directly to the calendar event block.

## Views

The widget supports three views switchable from the toolbar:

- **Day** — hourly timeline for a single day
- **Week** — hourly timeline for a full week (default)
- **Month** — grid view of the month

The selected view is persisted in the widget options between sessions.

## Read-only mode

When the widget is opened with `?readonly=true` or a non-full access level, event creation, editing, and deletion are disabled.
