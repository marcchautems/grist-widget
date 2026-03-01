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
| **Initials** | No | Text, ChoiceList, Any | Initials to display as colored circles on the event |
| **Initials Color** | No | Text, ChoiceList, Any | Background colors for the initials circles (one per initial, same order) |

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
