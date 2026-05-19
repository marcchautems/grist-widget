# Action Button Widget

A Grist custom widget that renders one or more buttons. Each button, when clicked, sends a batch of user actions (e.g. `AddRecord`, `RemoveRecord`, `UpdateRecord`) directly to the Grist data engine.

## Setup

1. Add the widget to a page and map a column to the **Action** field in the Creator Panel.
2. The mapped column must contain either a single button object or an array of button objects (see format below).

## Button object format

Each button is a Python dict (serialized to JSON by Grist) with the following fields:

| Field | Required | Type | Description |
|---|---|---|---|
| `button` | ✅ | string | Label displayed on the button |
| `description` | ✅ | string | Text shown on hover below the buttons |
| `actions` | ✅ | list | List of Grist user actions to execute on click |
| `color` | ☐ | string | Button background color (any CSS value, e.g. `"#e74c3c"`, `"green"`) |
| `textColor` | ☐ | string | Button text color (default: `"white"`) |
| `disabled` | ☐ | bool | When `True`, the button is grayed out and cannot be clicked |

If `color` or `textColor` are omitted the button uses the default blue (`#1486ff`) with white text.

## Grist action format

Each entry in `actions` is a list in the form:

```python
["ActionType", "TableName", row_id_or_None, {field_dict}]
```

Common action types: `"AddRecord"`, `"UpdateRecord"`, `"RemoveRecord"`.

## Python example

```python
def button_task_management():
    n_create = len(tasks_to_create)
    n_delete = len(tasks_to_delete)

    return [
        {
            "button": "Create {} missing tasks".format(n_create),
            "description": "Add {} new tasks to the plan".format(n_create),
            "actions": [["AddRecord", "Tasks", None, {"plan": rec.id}] for _ in tasks_to_create],
            "color": "#28a745",        # green
            "disabled": n_create == 0, # gray out when nothing to create
        },
        {
            "button": "Delete {} tasks".format(n_delete),
            "description": "Remove all existing tasks from the plan",
            "actions": [["RemoveRecord", "Tasks", t.id] for t in tasks_to_delete],
            "color": "#e74c3c",        # red
            "disabled": n_delete == 0,
        },
    ]
```

## Behavior

- Hovering over a button shows its `description` text below the button row.
- Buttons with `"disabled": True` are displayed at reduced opacity and cannot be clicked.
- If the column contains a single object (not a list), it is treated as a one-button array.
- On click, all actions in the list are applied in a single atomic transaction.
