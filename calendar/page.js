// to keep all calendar related logic;
let calendarHandler;

const CALENDAR_NAME = 'standardCalendar';

const t = i18next.t;

const urlParams = new URLSearchParams(window.location.search);
const isReadOnly = urlParams.get('readonly') === 'true' ||
  (urlParams.has('access') && urlParams.get('access') !== 'full');
const docTimeZone = urlParams.get('timeZone');

// Expose a few test variables on `window`.
window.gristCalendar = {
  calendarHandler,
  CALENDAR_NAME,
  dataVersion: Date.now(),
};

let TZDate = null;

function getLanguage() {
  if (this._lang) {
    return this._lang;
  } else {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    this._lang = urlParams.get('language') ?? 'en'
    return this._lang;
  }
}

//registering code to run when a document is ready
function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

function isRecordValid(record) {
  const hasStartDate = record.startDate instanceof Date;
  const maybeHasEndDate = record.endDate === undefined ||
    record.endDate === null ||
    record.endDate instanceof Date ;
    const hasTitle = typeof record.title === 'string';
  const maybeHasIsAllDay = record.isAllDay === undefined || typeof record.isAllDay === 'boolean';
  return hasStartDate && maybeHasEndDate && hasTitle && maybeHasIsAllDay;
}

function getMonthName() {
  return calendarHandler.calendar.getDate().toDate().toLocaleString(getLanguage(), {month: 'long', year: 'numeric'})
}

class CalendarHandler {
  //TODO: switch to new variables once they are published.
  _mainColor =  'var(--grist-theme-input-readonly-border)';
    _calendarBackgroundColor =  'var(--grist-theme-page-panels-main-panel-bg)';
  _selectedColor = 'var(--grist-theme-top-bar-button-primary-fg)';
  _borderStyle =  '1px solid var(--grist-theme-table-body-border)';
  _accentColor =  'var(--grist-theme-accent-text)';
  _textColor =  'var(--grist-theme-text)';
  _selectionColor =  'var(--grist-theme-selection)';
  _calendarTheme = () => {return {
    common: {
      backgroundColor: this._calendarBackgroundColor,
      border: this._borderStyle,
      holiday: {color: this._textColor},
      gridSelection: {
        backgroundColor: this._selectionColor,
        border: `1px solid ${this._selectionColor}`
      },
      dayName: {
        color: this._textColor,
      },
      today: {
        color: this._textColor,
      },
      saturday:{
        color: this._textColor,
      }
    },
    week:{
      timeGrid:{
        borderRight: this._borderStyle,
      },
      timeGridLeft:{
        borderRight: this._borderStyle,
      },
      panelResizer:{
        border: this._borderStyle,
      },
      dayName:{
        borderBottom: this._borderStyle,
        borderTop: this._borderStyle,
      },
      dayGrid:{
        borderRight: this._borderStyle,
      },
      dayGridLeft:{
        borderRight: this._borderStyle,
      },
      timeGridHourLine:{
        borderBottom: this._borderStyle
      },
      gridSelection: this._accentColor,

      pastTime:{
        color: this._textColor,
      },
      futureTime:{
        color: this._textColor,
    },
      nowIndicatorLabel: {
        color: 'var(--grist-theme-accent-text)',
      },
      nowIndicatorPast: {
        border: '1px dashed var(--grist-theme-accent-border)',
      },
      nowIndicatorBullet: {
        backgroundColor: 'var(--grist-theme-accent-text)',
      },
      nowIndicatorToday: {
        border: '1px solid var(--grist-theme-accent-border)',
      },
      today: {
        color: this._textColor,
        backgroundColor: 'inherit',
      },
    },
    month: {
      dayName:{
        borderLeft: this._borderStyle,
        backgroundColor: 'inherit',
      },
      dayExceptThisMonth: {
        color: this._textColor,
      },
      holidayExceptThisMonth: {
        color: this._textColor,
      },
    }}
  }

  _getCalendarOptions() {
    return {
      week: {
        taskView: false,
        dayNames: [t('Sun'), t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat')],
      },
      month: {
        dayNames: [t('Sun'), t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat')],
      },
      usageStatistics: false,
      theme: this._calendarTheme(),
      defaultView: 'week',
      isReadOnly,
      template: {
        time(event) {
          const {title} = event;
          const sanitizedTitle = title.replace('"','&quot;').trim();
          const badges = buildInitialsBadges(event.raw?.initials, event.raw?.initialsColor);
          const body = buildBodyLines(event.raw?.body);
          const desc = buildDescriptionLines(event.raw?.description);
          const priority = event.raw?.priorityEmoji
            ? `<span class="event-priority-emoji">${escapeHtml(String(event.raw.priorityEmoji))}</span>`
            : '';
          const count = event.raw?.taskCount !== undefined
            ? `<span class="event-task-count">${escapeHtml(String(event.raw.taskCount))}</span>`
            : '';
          const overlay = event.raw?.statusEmoji
            ? `<div class="event-status-overlay">${escapeHtml(String(event.raw.statusEmoji))}</div>`
            : '';
          return `<div class="event-content event-content--time"><span class="event-title-wrapper" title="${sanitizedTitle}"><span class="event-title-text">${title}</span>${badges}</span>${body}${desc}${priority}${count}${overlay}</div>`;
        },
        allday(event) {
          const {title} = event;
          const sanitizedTitle = title.replace('"','&quot;').trim();
          const badges = buildInitialsBadges(event.raw?.initials, event.raw?.initialsColor);
          const body = buildBodyLines(event.raw?.body);
          const desc = buildDescriptionLines(event.raw?.description);
          const priority = event.raw?.priorityEmoji
            ? `<span class="event-priority-emoji">${escapeHtml(String(event.raw.priorityEmoji))}</span>`
            : '';
          const count = event.raw?.taskCount !== undefined
            ? `<span class="event-task-count">${escapeHtml(String(event.raw.taskCount))}</span>`
            : '';
          const overlay = event.raw?.statusEmoji
            ? `<div class="event-status-overlay">${escapeHtml(String(event.raw.statusEmoji))}</div>`
            : '';
          return `<div class="event-content event-content--allday"><span class="event-title-wrapper" title="${sanitizedTitle}"><span class="event-title-text">${title}</span>${badges}</span>${body}${desc}${priority}${count}${overlay}</div>`;
        },
        popupDelete(){
          return t('Delete')
        },
        poupSave(){
          return t('Save')
        },
        popupEdit(){
          return t('Edit')
        },
        popupUpdate(){
          return t('Update')
        },
        allDayTitle() {
          return t('All Day')
        },
        popupIsAllday() {
          return t('All Day')
        }

      },
      calendars: [
        {
          id: CALENDAR_NAME,
          name: 'Personal',
          backgroundColor: this._mainColor,
          color: this._textColor,
          borderColor: this._mainColor,
        },
      ],
      useFormPopup: !isReadOnly,
      useDetailPopup: false, // We use our own logic to show this popup.
      gridSelection: {
        // Enable adding only via dbClick.
        enableDblClick: true,
        enableClick: false,
      },
    };
  }

  constructor() {
    const container = document.getElementById('calendar');
    if (isReadOnly) {
      container.classList.add('readonly')
    }
    const options = this._getCalendarOptions();
    this.calendar = new tui.Calendar(container, options);

    // Not sure how to get a reference to this constructor, so doing it in a roundabout way.
    TZDate = this.calendar.getDate().constructor;

    // Re-render TUI whenever the calendar container changes size (e.g. the Grist panel is
    // resized). TUI does not observe its own container. requestAnimationFrame batches rapid
    // callbacks into one render per frame to avoid redundant work.
    let _roRaf = null;
    const ro = new ResizeObserver(() => {
      if (_roRaf) { return; }
      _roRaf = requestAnimationFrame(() => {
        _roRaf = null;
        this.calendar.render();
      });
    });
    ro.observe(container);

    this.calendar.on('clickEvent', async (info) => {
      focusWidget();
      await grist.setCursorPos({rowId: info.event.id});
    });

    this.calendar.on('selectDateTime', async (info) => {
      this.calendar.clearGridSelections();

      // If this click results in the form popup, focus the title field in it.
      setTimeout(() => container.querySelector('input[name=title]')?.focus(), 0);
    });

    // Creation happens via the event-edit form.
    this.calendar.on('beforeCreateEvent', (eventInfo) => upsertEvent(eventInfo));

    // Updates happen via the form or when dragging the event or its end-time.
    this.calendar.on('beforeUpdateEvent', (update) => upsertEvent({id: update.event.id, ...update.changes}));

    // Deletion happens via the event-edit form.
    this.calendar.on('beforeDeleteEvent', (eventInfo) => deleteEvent(eventInfo));

    container.addEventListener('mousedown', () => {
      focusWidget();
      // Clear existing selection; this follows the suggested workaround in
      // https://github.com/nhn/tui.calendar/issues/1300#issuecomment-1273902472
      this.calendar.clearGridSelections();
    });

    container.addEventListener('mouseup', () => {
      // Fix dragging after a tap, when 'mouseup' follows the 'mousedown' so quickly that ToastUI
      // misses adding a handler, and doesn't stop the drag. If ToastUI handles it, it will stop
      // the drag or switch to a popup open. If on the next tick, the drag is still on, cancel it.
      setTimeout(() => {
        if (this.calendar.getStoreState('dnd').draggingState !== 0) {
          this.calendar.getStoreDispatchers('dnd').cancelDrag();
        }
      }, 0);
    });

    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        this.calendar.getStoreDispatchers('popup').hideFormPopup();
        this.calendar.getStoreDispatchers('popup').hideDetailPopup();
      } else if (ev.key === 'Enter') {
        // On a view popup, click "Edit"; on the edit popup, click "Save". Just try both to keep
        // it simple, since only one button will be present in practice.
        container.querySelector('button.toastui-calendar-edit-button')?.click();
        container.querySelector('button.toastui-calendar-popup-confirm')?.click();
      }
    });

    // All events, indexed by id.
    this._allEvents = new Map();

    // Ids of visible events that fall within the current date range. */
    this._visibleEventIds = new Set();
  }

  _isMultidayInMonthViewEvent(rec)  {
    const startDate = rec.start.toDate();
    const endDate = rec.end.toDate();
    const isItMonthView = this.calendar.getViewName() === 'month';
    const isEventMultiDay = startDate.getDate() !== endDate.getDate() ||
      startDate.getMonth() !== endDate.getMonth() ||
      startDate.getFullYear() !== endDate.getFullYear();
    return isItMonthView &&  !isEventMultiDay
  }

  async selectRecord(record) {
    if (!isRecordValid(record) || this._selectedRecordId === record.id) {
      return;
    }

    if (this._selectedRecordId) {
      this._clearHighlightEvent(this._selectedRecordId);
    }
    const [startType] = await colTypesFetcher.getColTypes();
    const startDate = getAdjustedDate(record.startDate, startType);
    this.calendar.setDate(startDate);
    this._selectedRecordId = record.id;
    updateUIAfterNavigation();

    // If the view has a vertical timeline, scroll to the start of the event.
    if (!record.isAllday && this.calendar.getViewName() !== 'month') {
      setTimeout(() => {
        const event = this.calendar.getElement(record.id, CALENDAR_NAME);
        if (!event) { return; }

        // Only scroll into view if the event is not fully on-screen.
        const container = event.closest('.toastui-calendar-time');
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const eventTop = event.offsetTop;
        const eventBottom = eventTop + event.clientHeight;
        const isOnscreen = eventTop >= containerTop && eventBottom <= containerBottom;
        if (!isOnscreen) {
          event.scrollIntoView({behavior: 'smooth'});
        }
      }, 0);
    }
  }

  _highlightEvent(eventId) {
    const event = this.calendar.getEvent(eventId, CALENDAR_NAME);
    if (!event) { return; }
    // If this event is shown on month view as a dot.
    const shouldPaintBackground = this._isMultidayInMonthViewEvent(event);
    // We will highlight it by changing the background color. Otherwise we will change the border color.
    const partToColor = shouldPaintBackground ? 'backgroundColor' : 'borderColor';
    this.calendar.updateEvent(eventId, CALENDAR_NAME, {
      ...{
        borderColor: event.raw?.['backgroundColor'] ?? this._mainColor,
        backgroundColor: event.raw?.['backgroundColor'] ?? this._mainColor,
      },
      [partToColor]: this._selectedColor
    });
  }

  _clearHighlightEvent(eventId) {
    const event = this.calendar.getEvent(eventId, CALENDAR_NAME);
    if (!event) { return; }
    // We will highlight it by changing the background color. Otherwise we will change the border color.
    this.calendar.updateEvent(eventId, CALENDAR_NAME, {
      borderColor: event.raw?.['backgroundColor'] ?? this._mainColor,
      backgroundColor: event.raw?.['backgroundColor'] ?? this._mainColor,
    });
  }

  // change calendar perspective between week, workweek, month and day.
  changeView(calendarViewPerspective) {
    if (calendarViewPerspective === 'workweek') {
      this.calendar.setOptions({ week: { workweek: true } });
      this.calendar.changeView('week');
    } else {
      this.calendar.setOptions({ week: { workweek: false } });
      this.calendar.changeView(calendarViewPerspective);
    }
    updateUIAfterNavigation();
  }

  // navigate to the previous time period
  calendarPrevious() {
    this.calendar.prev();
    updateUIAfterNavigation();
  }

  // navigate to the next time period
  calendarNext() {
    this.calendar.next();
    updateUIAfterNavigation();
  }

  //navigate to today
  calendarToday() {
    this.calendar.today();
    updateUIAfterNavigation();
  }

  refreshSelectedRecord(){
    if (this._selectedRecordId) {
      this._highlightEvent(this._selectedRecordId);
    }
  }

  getEvents() {
    return this._allEvents;
  }

  setEvents(events) {
    this._allEvents = events;
  }

  /**
   * Adds/updates events that fall within the current date range, and removes
   * events that do not.
   */
  renderVisibleEvents() {
    const newVisibleEventIds = new Set();
    const dateRangeStart = this.calendar.getDateRangeStart();
    const dateRangeEnd = this.calendar.getDateRangeEnd().setHours(23, 99, 99, 999);

    // Add or update events that are now visible.
    for (const event of this._allEvents.values()) {
      const isEventInRange = (
        (event.start >= dateRangeStart && event.start <= dateRangeEnd) ||
        (event.end >= dateRangeStart && event.end <= dateRangeEnd) ||
        (event.start < dateRangeStart && event.end > dateRangeEnd)
      );
      if (!isEventInRange) { continue; }
  
      const calendarEvent = this.calendar.getEvent(event.id, CALENDAR_NAME);
      if (!calendarEvent) {
        this.calendar.createEvents([event]);
      } else {
        this.calendar.updateEvent(event.id, CALENDAR_NAME, event);
      }
      newVisibleEventIds.add(event.id);
    }

    // Remove events that are no longer visible.
    for (const eventId of this._visibleEventIds) {
      if (!newVisibleEventIds.has(eventId)) {
        this.calendar.deleteEvent(eventId, CALENDAR_NAME);
      }
    }

    this._visibleEventIds = newVisibleEventIds;
  }
}

// when a document is ready, register the calendar and subscribe to grist events
ready(async () => {
  await translatePage();
  calendarHandler = new CalendarHandler();
  window.gristCalendar.calendarHandler = calendarHandler;
  setupPopupObserver();
  await configureGristSettings();

  // On mobile, scale the timegrid after TUI's initial render settles.
  if (window.innerWidth <= 520) {
    setTimeout(scaleMobileTimegrid, 100);
  }

});

// Data for column mapping fields in Widget GUI
function getGristOptions() {
  return [
    {
      name: "startDate",
      title: t("Start Date"),
      optional: false,
      type: "Date,DateTime",
      description: t("starting point of event"),
      allowMultiple: false,
      strictType: true
    },
    {
      name: "endDate",
      title: t("End Date"),
      optional: true,
      type: "Date,DateTime",
      description: t("ending point of event"),
      allowMultiple: false,
      strictType: true
    },
    {
      name: "isAllDay",
      title: t("Is All Day"),
      optional: true,
      type: "Bool",
      description: t("is event all day long"),
      strictType: true
    },
    {
      name: "title",
      title: t("Title"),
      optional: false,
      type: "Text",
      description: t("title of event"),
      allowMultiple: false
    },
    {
      name: "type",
      title: t("Type"),
      optional: true,
      type: "Choice,ChoiceList",
      description: t("event category and style"),
      allowMultiple: false
    },
    {
      name: "body",
      title: t("Details"),
      optional: true,
      type: "Text,Numeric,Integer,Date,DateTime,Bool,Choice,Ref,RefList,Any",
      description: t("additional fields shown below the title, one per line"),
      allowMultiple: true
    },
    {
      name: "description",
      title: t("Description"),
      optional: true,
      type: "Text,Ref,RefList,Any",
      description: t("multi-line fields shown below details (wraps up to 4 lines each)"),
      allowMultiple: true
    },
    {
      name: "initials",
      title: t("Initials"),
      optional: true,
      type: "Text,ChoiceList,Any",
      description: t("initials to display on event — supports multiple values (list)"),
      allowMultiple: false
    },
    {
      name: "initialsColor",
      title: t("Initials Color"),
      optional: true,
      type: "Text,ChoiceList,Any",
      description: t("colors for initials circles — one per initial, same order (e.g. #e74c3c)"),
      allowMultiple: false
    },
    {
      name: "statusEmoji",
      title: t("Status Emoji"),
      optional: true,
      type: "Text,Any",
      description: t("emoji shown as a semi-transparent overlay on the event card (e.g. ✅ or 🚫); empty = no overlay"),
      allowMultiple: false
    },
    {
      name: "priorityEmoji",
      title: t("Priority"),
      optional: true,
      type: "Text,Any",
      description: t("emoji shown in the bottom-left corner of the event card (e.g. 🔴 🟡 🟢)"),
      allowMultiple: false
    },
    {
      name: "taskCount",
      title: t("Task Count"),
      optional: true,
      type: "Numeric,Integer,Text,Any",
      description: t("number or label shown as a badge in the bottom-right corner of the event card"),
      allowMultiple: false
    },
    {
      name: "nameInput",
      title: t("Name Input"),
      optional: true,
      type: "Text",
      description: t("column the creation/edit form writes to — map this when Title is a computed formula so the form doesn't try to write to a read-only column"),
      allowMultiple: false
    },
    {
      name: "formFields",
      title: t("Form Fields"),
      optional: true,
      type: "Text,Numeric,Integer,Bool,Choice,ChoiceList,Ref,RefList,Any",
      description: t("columns shown as extra inputs in the event creation form (one row per column)"),
      allowMultiple: true
    }
  ];
}


// Toggle a CSS class on #calendar that reflects whether any all-day events are visible.
// Used by a mobile CSS rule to collapse the all-day row when it's empty.
// On mobile, double all pixel heights/positions inside the timegrid so hour rows are
// ~2× taller and easier to tap. TUI uses inline pixel styles for event positioning,
// so a CSS height override alone cannot move events — we patch the values after render.
// data-scaled-from guards against double-scaling within the same render cycle.
function scaleMobileTimegrid() {
  if (window.innerWidth > 520) return;
  const timegrid = document.querySelector('#calendar .toastui-calendar-timegrid');
  if (!timegrid) return;
  const currentH = parseFloat(timegrid.style.height);
  const scaledFrom = parseFloat(timegrid.dataset.scaledFrom || '0');
  // Skip if already scaled from this TUI-calculated height.
  if (currentH <= 0 || currentH === scaledFrom * 2) return;
  timegrid.dataset.scaledFrom = String(currentH);
  timegrid.style.height = (currentH * 2) + 'px';
  // Hour label rows (left time column)
  timegrid.querySelectorAll('.toastui-calendar-timegrid-hour').forEach(el => {
    const h = parseFloat(el.style.height);
    if (h > 0) el.style.height = (h * 2) + 'px';
  });
  // 30-min grid slot lines
  timegrid.querySelectorAll('.toastui-calendar-timegrid-slot').forEach(el => {
    const h = parseFloat(el.style.height);
    if (h > 0) el.style.height = (h * 2) + 'px';
  });
  // Events: scale top + height; mark to avoid re-scaling the same element
  timegrid.querySelectorAll('.toastui-calendar-time-event:not([data-mobile-scaled])').forEach(el => {
    el.dataset.mobileScaled = '1';
    const top = parseFloat(el.style.top);
    const h = parseFloat(el.style.height);
    if (el.style.top) el.style.top = (top * 2) + 'px';
    if (h > 0) el.style.height = (h * 2) + 'px';
  });
}

function updateAlldayClass() {
  const cal = document.getElementById('calendar');
  if (!cal) { return; }
  const hasAllday = !!cal.querySelector(
    '.toastui-calendar-panel:not(.toastui-calendar-time) [class*="weekday-event"]'
  );
  cal.classList.toggle('has-allday-events', hasAllday);
}

function updateUIAfterNavigation() {
  calendarHandler.renderVisibleEvents();
  // update name of the month and year displayed on the top of the widget
  document.getElementById('calendar-title').innerText = getMonthName();
  // refresh colors of selected event (in month view it's different from in other views)
  calendarHandler.refreshSelectedRecord();
  updateAlldayClass();
  setTimeout(scaleMobileTimegrid, 0);
}

// let's subscribe to all the events that we need
async function configureGristSettings() {
  // CRUD operations on records in table
  grist.onRecords(updateCalendar);
  // When cursor (selected record) change in the table
  grist.onRecord(gristSelectedRecordChanged);
  // When options changed in the widget configuration (reaction to perspective change)
  grist.onOptions(onGristSettingsChanged);

  // To get types, we need to know the tableId. This is a way to get it.
  grist.on('message', (e) => {
    if (e.tableId && e.mappingsChange) {
      colTypesFetcher.gotNewMappings(e.tableId);
      refreshFormFieldConfigs();
    }
  });

  // TODO: remove optional chaining once grist-plugin-api.js includes this function.
  grist.enableKeyboardShortcuts?.();

  // Close the mobile view menu when the user taps outside it.
  document.addEventListener('mousedown', (e) => {
    const menu = document.getElementById('calendar-view-menu');
    const btn  = document.getElementById('calendar-view-menu-btn');
    if (menu && !menu.hidden && !menu.contains(e.target) && e.target !== btn) {
      menu.hidden = true;
    }
  });

  // bind columns mapping options to the GUI
  const columnsMappingOptions = getGristOptions();
  grist.ready({requiredAccess: 'full', columns: columnsMappingOptions, allowSelectBy: true});
}

async function translatePage() {

  const backendOptions = {

    loadPath: 'i18n/{{lng}}/{{ns}}.json',
    addPath: 'i18n/add/{{lng}}/{{ns}}',
    // don't allow cross domain requests
    crossDomain: false,
    // don't include credentials on cross domain requests
    withCredentials: false,
    // overrideMimeType sets request.overrideMimeType("application/json")
    overrideMimeType: false,
  }
  await i18next.use(i18nextHttpBackend).init({
    lng: getLanguage(),
    debug: false,
    saveMissing: true,
    returnNull: false,
    backend: backendOptions,
  }, function (err, t) {
    document.body.querySelectorAll('[data-i18n]').forEach(function (elem) {
      elem.textContent = t(elem.dataset.i18n);
    });
  });
}

// When a user selects a record in the table, we want to select it on the calendar.
function gristSelectedRecordChanged(record, mappings) {
  const mappedRecord = grist.mapColumnNames(record, mappings);
  if (mappedRecord && calendarHandler) {
    calendarHandler.selectRecord(mappedRecord);
  }
}

// Open/close the mobile ⋮ view-selection dropdown.
function toggleViewMenu(btn) {
  const menu = document.getElementById('calendar-view-menu');
  if (!menu.hidden) { menu.hidden = true; return; }
  const rect = btn.getBoundingClientRect();
  menu.style.top  = (rect.bottom + 4) + 'px';
  menu.style.left = rect.left + 'px';
  menu.hidden = false;
}

function closeViewMenu() {
  const menu = document.getElementById('calendar-view-menu');
  if (menu) { menu.hidden = true; }
}

// when a user changes the perspective in the GUI, we want to save it as grist option
// - rest of logic is in reaction to the grist option changed
async function calendarViewChanges(radiobutton) {
  closeViewMenu();
  changeCalendarView(radiobutton.value);
  if (!isReadOnly) {
    await grist.setOption('calendarViewPerspective', radiobutton.value);
  }
}

// When a user changes a perspective of calendar, we want this to be persisted in grist options between sessions.
// this is the place where we can react to this change and update calendar view, or when new session is started
// (so we are loading previous settings)
function onGristSettingsChanged(options, settings) {
  const view = options?.calendarViewPerspective ?? 'week';
  changeCalendarView(view);
  colTypesFetcher.setAccessLevel(settings.accessLevel);
};

function changeCalendarView(view) {
  selectRadioButton(view);
  calendarHandler.changeView(view);
}

// saving events to the table or updating existing one - basing on if ID is present or not in the send event
async function upsertGristRecord(gristEvent, extraFields = {}) {
  try {
    //to update the table, grist requires another format that it is returning by grist in onRecords event (it's flat is
    // onRecords event and nested ({id:..., fields:{}}) in grist table), so it needs to be converted
    const mappedRecord = grist.mapColumnNamesBack(gristEvent);if (!mappedRecord) { return; }
    // we cannot save record is some unexpected columns are defined in fields, so we need to remove them
    delete mappedRecord.id;
    // Merge extra popup fields (already keyed by actual column ID, bypass mapping).
    // Filter out null/empty — user left the field blank, no point writing.
    for (const [k, v] of Object.entries(extraFields)) {
      if (v !== null && v !== undefined && v !== '') { mappedRecord[k] = v; }
    }
    // mapColumnNamesBack returns undefined for all absent fields, so we need to remove them as well
    // (we also use undefined for updates when a field hasn't changed).
    const filteredRecord = Object.fromEntries(Object.entries(mappedRecord)
                                 .filter(([key, value]) => value !== undefined));
    // Send nothing if there are no changes.
    if (Object.keys(filteredRecord).length === 0) { return; }
    const eventInValidFormat = {id: gristEvent.id, fields: filteredRecord};
    const table = await grist.getTable();
    if (gristEvent.id) {
      await table.update(eventInValidFormat);
    } else {
      const {id} =await table.create(eventInValidFormat);
      await grist.setCursorPos({rowId: id});
    }
  } catch (err) {
    // Nothing clever we can do here, just log the error.
    // Grist should actually show the error in the UI, but it doesn't.
    console.error(err);
  }
}

const secondsPerDay = 24 * 60 * 60;

function makeGristDateTime(tzDate, colType) {
  // tzDate is a date in local's (current browser's) timezone.
  // So if user is in UTC-5 and document is in UTC+2, we need to adjust the time by 7 hours (in minutes it's 420
  // and in seconds it's 25200). So basically reinterpret the time as UTC+2.

  // Here is the math. If we were to store the current time as it is, the document would see it as
  // 7 hours later. So we need to subtract 7 hours from the time that user picked.

  // For example: If user is in UTC-5 and document is in UTC+2, and user picked his current time 10:00, for a document
  // perspective it is 17:00 (as the current time for document is 7h ahead of user's time). So we need to subtract
  // 7 hours from 10:00 to get 3:00, which is 10:00 for document (in UTC+2) as it is 7 hours ahead.
  
  let unixTime = Math.floor(tzDate.valueOf() / 1000);

  // Get this date timezone (local one). NOTE: it has opposite sign to what will
  // be returned from a tzDate with a timezone marker
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
  const localOffsetMin = -tzDate.getTimezoneOffset();

  // If we set timezone, it will have a correct sign.
  const docOffsetMin = !docTimeZone ? localOffsetMin : tzDate.tz(docTimeZone).getTimezoneOffset();

  if (colType === 'Date') {
    // Reinterpret the time as UTC. Note: timezone offset is in minutes.
    const secondsSinceEpoch = unixTime + localOffsetMin * 60;
    // Round down to UTC midnight.
    return Math.floor(secondsSinceEpoch / secondsPerDay) * secondsPerDay;
  } else {
    // So if user is in UTC-5 (local) and document is in UTC+2 (doc) the result is -7h = -5h - 2h
    const toShift = (localOffsetMin - docOffsetMin) * 60 /* offsets are in minutes */;
    unixTime += toShift;
    return unixTime;
  }
}

async function upsertEvent(tuiEvent) {
  // conversion between calendar event object and grist flat format (so the one that is returned in onRecords event
  // and can be mapped by grist.mapColumnNamesBack)
  // tuiEvent can be partial: only the fields present will be updated in Grist.

  // Capture and clear popup fields synchronously (before any await) so that
  // a second rapid save can't see stale values.
  const capturedFields = { ...pendingPopupFields };
  pendingPopupFields = {};

  const [startType, endType] = await colTypesFetcher.getColTypes();
  const gristEvent = {
    id: tuiEvent.id,
    // undefined values will be removed from the fields sent to Grist.
    startDate: tuiEvent.start ? makeGristDateTime(tuiEvent.start, startType) : undefined,
    endDate: tuiEvent.end ? makeGristDateTime(tuiEvent.end, endType) : undefined,
    isAllDay: tuiEvent.isAllday !== undefined ? (tuiEvent.isAllday ? 1 : 0) : undefined,
    // If a separate nameInput column is mapped, write the form title there
    // (keeps the display Title column free to be a computed formula).
    // Otherwise fall back to writing directly to title.
    ...(currentMappings?.nameInput
      ? { nameInput: tuiEvent.title !== undefined ? (tuiEvent.title || "New Event") : undefined }
      : { title:     tuiEvent.title !== undefined ? (tuiEvent.title || "New Event") : undefined }
    ),
  };
  // capturedFields is keyed by actual Grist column IDs — pass through directly.
  // Drag/resize updates leave capturedFields empty so existing values are preserved.
  upsertGristRecord(gristEvent, capturedFields);
}

async function deleteEvent(event) {
  try {
    const table = await grist.getTable();
    await table.destroy(event.id);
  } catch (e) {
    console.error(e);
  }
}

//helper function to select radio button in the GUI
function selectRadioButton(value) {
  for (const element of document.getElementsByName('calendar-options')) {
    if (element.value === value) {
      element.checked = true;
      element.parentElement.classList.add('active');
    }
    else{
      element.checked = false;
      element.parentElement.classList.remove('active');
    }
  }
}

/**
 * Returns a new date that's shifted towards UTC+0 if `colType` is `Date`.
 *
 * Returns `date` unchanged if `colType` is `DateTime`.
 */
function getAdjustedDate(date, colType) {
  // If we know the timezone, we need to adjust it so that it looks the same.
  // So by default we pretend that calendar renders document timezone.
  // But we avoid conversion if document and date timezones are the same 
  // (otherwise it sometimes gets messed up by SDT/DST conversion problems)
  if (docTimeZone && docTimeZone !== date.timezone && colType.startsWith('DateTime')) {
    return new TZDate(date).tz(docTimeZone);
  }
  if (colType !== 'Date') { return date; }

  // Like date.tz('UTC'), but accounts for DST differences.
  const ms = date.valueOf() + (date.getTimezoneOffset() * 60000);
  return new Date(ms);
}

// helper function to build a calendar event object from grist flat record
function buildCalendarEventObject(record, colTypes, colOptions) {
  let {startDate: start, endDate: end, isAllDay: isAllday} = record;
  let [startType, endType] = colTypes;
  let [,,type] = colOptions;
  endType = endType || startType;
  start = getAdjustedDate(start, startType);
  end = end ? getAdjustedDate(end, endType) : start;

  // Normalize records with invalid start/end times so that they're visible
  // in the calendar.
  if (end < start) { end = start; }

  if (startType === 'Date' && endType === 'Date') {
    isAllday = true;
  }
  // Workaround for midnight zero-length events not showing up.
  if (!isAllday && end.valueOf() === start.valueOf() && isZeroTime(end) && isZeroTime(start)) {
    end = new TZDate(end).addHours(1);
  }

  // Apply colors from the type column.
  const selected = (Array.isArray(record.type) ? record.type[0] : record.type) ?? '';
  const raw = clean({
    backgroundColor: type?.choiceOptions?.[selected]?.fillColor,
    color: type?.choiceOptions?.[selected]?.textColor,
    body: record.body ? (Array.isArray(record.body) ? record.body : [record.body]) : undefined,
    description: record.description ? (Array.isArray(record.description) ? record.description : [record.description]) : undefined,
    initials: record.initials ? (Array.isArray(record.initials) ? record.initials : [record.initials]) : undefined,
    initialsColor: record.initialsColor ? (Array.isArray(record.initialsColor) ? record.initialsColor : [record.initialsColor]) : undefined,
    statusEmoji: record.statusEmoji || undefined,
    priorityEmoji: record.priorityEmoji || undefined,
    taskCount: (record.taskCount !== undefined && record.taskCount !== null && record.taskCount !== '') ? record.taskCount : undefined,
  });
  const fontWeight = type?.choiceOptions?.[selected]?.fontBold ? '800' : 'normal';
  const fontStyle = type?.choiceOptions?.[selected]?.fontItalic ? 'italic' : 'normal';
  let textDecoration = type?.choiceOptions?.[selected]?.fontUnderline ? 'underline' : 'none';
  if (type?.choiceOptions?.[selected]?.fontStrikethrough) {
    textDecoration = textDecoration === 'underline' ? 'line-through underline' : 'line-through';
  }
  return {
    id: record.id,
    calendarId: CALENDAR_NAME,
    title: record.title,
    start,
    end,
    isAllday,
    category: 'time',
    state: 'Free',
    color: this._textColor,
    backgroundColor: this._mainColor,
    dragBackgroundColor: 'var(--grist-theme-hover)',
    raw, // Store it as an custom property. It will be used to revert any highlighting that might be done.
    ...raw, // And now paint the event with the color.
    borderColor: raw.backgroundColor, // We don't have a border color, so use the background color.
    customStyle: {
      fontStyle,
      fontWeight,
      textDecoration,
      textWrap : 'auto',
    }
  };
}

// Current column mappings — kept up to date by updateCalendar so upsertEvent can read them.
let currentMappings = null;

// Config for each mapped Form Field column: [{colId, label, type, refOptions, choiceItems}] or null.
// refOptions: [{id, label}] for Ref columns; choiceItems: [string] for Choice/ChoiceList columns.
let formFieldConfigs = null;

// Values captured from injected popup fields just before TUI fires beforeCreateEvent.
// Keyed by actual Grist column ID.
let pendingPopupFields = {};

// Resolve which colId from a referenced table to use as display labels for a Ref/RefList column.
// Tries three approaches in order and verifies each against the actual table data.
function resolveRefDisplayColId(rec, allColumns, refTable) {
  const widgetOptions = safeParse(rec.widgetOptions);
  const visRef = widgetOptions?.visibleCol;
  const refTableKeys = Object.keys(refTable);
  console.debug('[resolveRefDisplayColId] col=%s widgetOptions=%o visRef=%o displayCol=%o refTableKeys=%o',
    rec.colId, widgetOptions, visRef, rec.displayCol, refTableKeys);

  // Approach 1: widgetOptions.visibleCol as an integer row ID in _grist_Tables_column.
  if (typeof visRef === 'number' && visRef > 0) {
    const idx = allColumns.id.indexOf(visRef);
    console.debug('[resolveRefDisplayColId] A1: visRef=%o idx=%o colId=%o', visRef, idx, idx !== -1 ? allColumns.colId[idx] : 'n/a');
    if (idx !== -1) {
      const cid = allColumns.colId[idx];
      if (cid && refTable[cid] !== undefined) { console.debug('[resolveRefDisplayColId] → A1 resolved:', cid); return cid; }
    }
  }
  // Approach 2: widgetOptions.visibleCol already a colId string.
  if (typeof visRef === 'string' && visRef && refTable[visRef] !== undefined) {
    console.debug('[resolveRefDisplayColId] → A2 resolved:', visRef);
    return visRef;
  }
  // Approach 3: displayCol → its formula column → parse "$col.field" to extract "field".
  const dispRef = rec.displayCol;
  if (typeof dispRef === 'number' && dispRef > 0) {
    const idx = allColumns.id.indexOf(dispRef);
    const formula = idx !== -1 ? (allColumns.formula?.[idx] ?? null) : null;
    console.debug('[resolveRefDisplayColId] A3: dispRef=%o idx=%o formula=%o', dispRef, idx, formula);
    if (idx !== -1 && typeof formula === 'string') {
      const m = /\$\w+\.(\w+)$/.exec(formula.trim());
      if (m && refTable[m[1]] !== undefined) { console.debug('[resolveRefDisplayColId] → A3 resolved:', m[1]); return m[1]; }
    }
  }
  console.debug('[resolveRefDisplayColId] → null (no approach succeeded)');
  return null;
}

// Fetch metadata and referenced-table data for every column in the formFields mapping.
async function refreshFormFieldConfigs() {
  if (!currentMappings?.formFields || !colTypesFetcher._tableId) { return; }
  const colIds = Array.isArray(currentMappings.formFields)
    ? currentMappings.formFields
    : [currentMappings.formFields];
  if (!colIds.length) { return; }
  const colRecords = await ColTypesFetcher.getTypes(colTypesFetcher._tableId, colIds);
  // _grist_Tables_column is needed to resolve the display column for Ref fields.
  const allColumns = await grist.docApi.fetchTable('_grist_Tables_column');
  const configs = [];
  for (let i = 0; i < colIds.length; i++) {
    const colId = colIds[i];
    const rec = colRecords[i];
    if (!rec) { continue; }
    const type = rec.type;                          // e.g. "Text", "Ref:activities", "Bool", "Choice"
    const label = rec.label || colId;
    const widgetOptions = safeParse(rec.widgetOptions);
    let refOptions = null;
    let choiceItems = null;
    if (type?.startsWith('Ref:') || type?.startsWith('RefList:')) {
      const refTableId = type.startsWith('Ref:') ? type.slice(4) : type.slice(8);
      const table = await grist.docApi.fetchTable(refTableId);
      if (table?.id) {
        const visibleColId = resolveRefDisplayColId(rec, allColumns, table);
        console.debug('[refreshFormFieldConfigs] col=%s refTable=%s visibleColId=%o tableKeys=%o',
          colId, refTableId, visibleColId, Object.keys(table));
        const labels = (visibleColId && table[visibleColId]) || table.name || table.label;
        if (labels) {
          refOptions = table.id
            .map((id, j) => ({ id, label: String(labels[j] ?? id) }))
            .filter(o => o.label);
        }
      }
    } else if (type === 'Choice' || type === 'ChoiceList') {
      choiceItems = widgetOptions?.choices || [];
    }
    configs.push({ colId, label, type, refOptions, choiceItems });
  }
  formFieldConfigs = configs;
  // If popup already open, inject now (race-condition safety).
  const popup = document.querySelector('.toastui-calendar-popup-container');
  if (popup) { injectPopupFields(popup); }
}

// Build the <input> or <select> HTML string for one field config.
function buildFieldInput(config) {
  const col = escapeHtml(config.colId);
  if ((config.type?.startsWith('Ref:') || config.type?.startsWith('RefList:')) && config.refOptions) {
    const isMulti = config.type?.startsWith('RefList:');
    const opts = config.refOptions
      .map(o => `<option value="${o.id}">${escapeHtml(o.label)}</option>`)
      .join('');
    if (isMulti) {
      // Chip-based multi-select: custom panel that stays open, highlights selections.
      const optItems = config.refOptions
        .map(o => `<div class="grist-popup-reflist-option" data-val="${o.id}">${escapeHtml(o.label)}</div>`)
        .join('');
      return `<div class="grist-popup-reflist-container" data-grist-col="${col}">` +
        `<div class="grist-popup-reflist-chips"></div>` +
        `<button type="button" class="grist-popup-reflist-trigger toastui-calendar-popup-input toastui-calendar-content grist-popup-select">` +
          `<span class="grist-popup-reflist-placeholder">—</span>` +
          `<span class="grist-popup-reflist-caret">&#9660;</span>` +
        `</button>` +
        `<div class="grist-popup-reflist-panel" hidden>${optItems}</div>` +
      `</div>`;
    }
    return `<select data-grist-col="${col}" class="toastui-calendar-popup-input toastui-calendar-content grist-popup-select">` +
      `<option value="">—</option>${opts}</select>`;
  }
  if (config.type === 'Choice' || config.type === 'ChoiceList') {
    const opts = (config.choiceItems || [])
      .map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join('');
    return `<select data-grist-col="${col}" class="toastui-calendar-popup-input toastui-calendar-content grist-popup-select">` +
      `<option value="">—</option>${opts}</select>`;
  }
  if (config.type === 'Bool') {
    return `<label class="grist-popup-checkbox-row">` +
      `<input type="checkbox" data-grist-col="${col}" class="grist-popup-checkbox" />` +
      `<span>${escapeHtml(config.label)}</span></label>`;
  }
  if (config.type === 'Int' || config.type === 'Numeric') {
    return `<input type="number" data-grist-col="${col}"` +
      ` class="toastui-calendar-popup-input toastui-calendar-content grist-popup-number-input"` +
      ` placeholder="${escapeHtml(config.label)}" />`;
  }
  // Text / Any / other: use a textarea so content can span multiple lines.
  return `<textarea data-grist-col="${col}"` +
    ` class="toastui-calendar-popup-input toastui-calendar-content grist-popup-textarea"` +
    ` placeholder="${escapeHtml(config.label)}" rows="1"></textarea>`;
}

// Append a removable chip to chipsDiv for a RefList field.
function addChip(chipsDiv, val, label) {
  // Prevent duplicate chips for the same value.
  if ([...chipsDiv.querySelectorAll('.grist-popup-chip')].some(c => c.dataset.val === val)) { return; }
  const chip = document.createElement('span');
  chip.className = 'grist-popup-chip';
  chip.dataset.val = val;
  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'grist-popup-chip-remove';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => chip.remove());
  chip.appendChild(labelSpan);
  chip.appendChild(removeBtn);
  chipsDiv.appendChild(chip);
}

// Sync the "selected" highlight on panel options to match current chips.
function syncRefListHighlights(chipsDiv, panel) {
  const selected = new Set([...chipsDiv.querySelectorAll('.grist-popup-chip')].map(c => c.dataset.val));
  panel.querySelectorAll('.grist-popup-reflist-option').forEach(opt => {
    opt.classList.toggle('selected', selected.has(opt.dataset.val));
  });
}

// Inject extra field rows into TUI's form popup.
function injectPopupFields(popup) {
  if (!currentMappings?.formFields || !formFieldConfigs?.length) { return; }
  if (popup.querySelector('.grist-popup-extra-fields')) { return; } // already injected
  const container = document.createElement('div');
  container.className = 'grist-popup-extra-fields';
  for (const config of formFieldConfigs) {
    const isBool = config.type === 'Bool';
    const isRefList = config.type?.startsWith('RefList:');
    const row = document.createElement('div');
    row.className = 'toastui-calendar-popup-section';
    // Bool fields embed the label inside the checkbox row; others show it as a separate span.
    const labelHtml = isBool ? '' : `<span class="grist-popup-field-label">${escapeHtml(config.label)}</span>`;
    row.innerHTML = `<div class="toastui-calendar-popup-section-item">${labelHtml}${buildFieldInput(config)}</div>`;
    container.appendChild(row);

    // Wire auto-resize for textarea fields.
    const textarea = row.querySelector('.grist-popup-textarea');
    if (textarea) {
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
    }

    // Wire up the custom panel multi-select for RefList fields.
    if (isRefList) {
      const chipsDiv = row.querySelector('.grist-popup-reflist-chips');
      const trigger = row.querySelector('.grist-popup-reflist-trigger');
      const panel = row.querySelector('.grist-popup-reflist-panel');
      const refCont = row.querySelector('.grist-popup-reflist-container');
      if (trigger && panel && chipsDiv && refCont) {
        // Position and show the panel, flipping upward when near the bottom of the viewport.
        function openPanel() {
          document.querySelectorAll('.grist-popup-reflist-panel:not([hidden])').forEach(p => { p.hidden = true; });
          const rect = trigger.getBoundingClientRect();
          const PANEL_MAX = 200;
          const spaceBelow = window.innerHeight - rect.bottom - 8;
          const spaceAbove = rect.top - 8;
          panel.style.left = rect.left + 'px';
          panel.style.minWidth = rect.width + 'px';
          if (spaceBelow < PANEL_MAX && spaceAbove > spaceBelow) {
            // Not enough room below — open upward.
            panel.style.top = '';
            panel.style.bottom = (window.innerHeight - rect.top + 2) + 'px';
            panel.style.maxHeight = Math.min(PANEL_MAX, spaceAbove) + 'px';
          } else {
            // Enough room below (or more room below than above) — open downward.
            panel.style.top = (rect.bottom + 2) + 'px';
            panel.style.bottom = '';
            panel.style.maxHeight = Math.min(PANEL_MAX, spaceBelow) + 'px';
          }
          panel.hidden = false;
          syncRefListHighlights(chipsDiv, panel);
          trigger.focus();
        }

        // Toggle the panel open/closed when clicking the trigger button.
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!panel.hidden) { panel.hidden = true; } else { openPanel(); }
        });

        // Typeahead: accumulate quickly-typed characters, scroll to the first option
        // that starts with the buffer; reset the buffer after 500 ms of inactivity.
        let typeaheadBuffer = '';
        let typeaheadTimer = null;
        trigger.addEventListener('keydown', (e) => {
          if (panel.hidden) return;
          if (e.key === 'Escape') { panel.hidden = true; return; }
          if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
          clearTimeout(typeaheadTimer);
          typeaheadBuffer += e.key.toLowerCase();
          typeaheadTimer = setTimeout(() => { typeaheadBuffer = ''; }, 500);
          const opts = [...panel.querySelectorAll('.grist-popup-reflist-option')];
          const match = opts.find(o => o.textContent.trim().toLowerCase().startsWith(typeaheadBuffer));
          if (match) { match.scrollIntoView({ block: 'nearest' }); }
        });

        // Toggle individual item selection inside the panel (panel stays open).
        panel.addEventListener('click', (e) => {
          e.stopPropagation();
          const opt = e.target.closest('.grist-popup-reflist-option');
          if (!opt) return;
          const val = opt.dataset.val;
          const label = opt.textContent.trim();
          const existingChip = [...chipsDiv.querySelectorAll('.grist-popup-chip')].find(c => c.dataset.val === val);
          if (existingChip) {
            existingChip.remove();
            opt.classList.remove('selected');
          } else {
            addChip(chipsDiv, val, label);
            opt.classList.add('selected');
          }
        });

        // Close the panel on mousedown outside the reflist container (catches all clicks
        // including those TUI might stop-propagate in their bubble phase).
        document.addEventListener('mousedown', (e) => {
          if (!panel.hidden && !refCont.contains(e.target)) { panel.hidden = true; }
        });
      }
    }
  }
  const buttonBar = popup.querySelector('.toastui-calendar-popup-button-bar');
  if (buttonBar) {
    buttonBar.parentNode.insertBefore(container, buttonBar);
  } else {
    popup.appendChild(container);
  }
  // Capture all field values during the capture phase so they're ready before
  // TUI fires beforeCreateEvent in the bubble phase.
  popup.querySelector('.toastui-calendar-popup-confirm')
    ?.addEventListener('click', () => {
      for (const config of formFieldConfigs) {
        if (config.type === 'Bool') {
          const el = popup.querySelector(`[data-grist-col="${config.colId}"]`);
          if (el) { pendingPopupFields[config.colId] = el.checked; }
        } else if (config.type?.startsWith('RefList:')) {
          // Collect IDs from chips, not from the select value.
          const refContainer = popup.querySelector(`.grist-popup-reflist-container[data-grist-col="${config.colId}"]`);
          const ids = refContainer
            ? [...refContainer.querySelectorAll('.grist-popup-chip')].map(c => Number(c.dataset.val)).filter(Boolean)
            : [];
          pendingPopupFields[config.colId] = ids.length > 0 ? ['L', ...ids] : null;
        } else {
          const el = popup.querySelector(`[data-grist-col="${config.colId}"]`);
          if (!el) { continue; }
          if (config.type?.startsWith('Ref:')) {
            pendingPopupFields[config.colId] = el.value ? Number(el.value) : null;
          } else if (config.type === 'Int') {
            pendingPopupFields[config.colId] = el.value !== '' ? parseInt(el.value, 10) : null;
          } else if (config.type === 'Numeric') {
            pendingPopupFields[config.colId] = el.value !== '' ? parseFloat(el.value) : null;
          } else {
            pendingPopupFields[config.colId] = el.value || null;
          }
        }
      }
    }, { capture: true, once: true });
}

// Watch for TUI's form popup appearing in the DOM and inject extra fields into it.
function setupPopupObserver() {
  const container = document.getElementById('calendar');
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) { continue; }
        const popup = node.classList?.contains('toastui-calendar-popup-container')
          ? node
          : node.querySelector?.('.toastui-calendar-popup-container');
        if (popup) { injectPopupFields(popup); }
      }
    }
  });
  observer.observe(container, { subtree: true, childList: true });
}

// when some CRUD operation is performed on the table, we want to update the calendar
async function updateCalendar(records, mappings) {
  if (mappings) {
    colTypesFetcher.gotMappings(mappings);
    const prevFormFields = JSON.stringify(currentMappings?.formFields);
    currentMappings = mappings;
    if (JSON.stringify(mappings.formFields) !== prevFormFields) {
      formFieldConfigs = null;
      refreshFormFieldConfigs();
    }
  }

  const mappedRecords = grist.mapColumnNames(records, mappings);
  // if any records were successfully mapped, create or update them in the calendar
  if (mappedRecords) {
    const colTypes = await colTypesFetcher.getColTypes();
    const colOptions = await colTypesFetcher.getColOptions();
    const events = mappedRecords
      .filter(isRecordValid)
      .map(r => buildCalendarEventObject(r, colTypes, colOptions));
    calendarHandler.setEvents(new Map(events.map(event => ([event.id, event]))));
    updateUIAfterNavigation();
  }
  window.gristCalendar.dataVersion = Date.now();
}

function focusWidget() {
  window.focus();
}

function isZeroTime(date) {
  return date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;
}

// We have no good way yet to get the type of a mapped column when multiple types are allowed. We
// get it via the metadata tables instead. There is no good way to know when a column's type is
// changed, so we skip that for now.
// TODO: Drop all this once the API can tell us column info.
class ColTypesFetcher {
  // Returns array of column records for the array of colIds.
  static async getTypes(tableId, colIds) {
    const tables = await grist.docApi.fetchTable('_grist_Tables');
    const columns = await grist.docApi.fetchTable('_grist_Tables_column');
    const fields = Object.keys(columns);
    const tableRef = tables.id[tables.tableId.indexOf(tableId)];
    return colIds.map(colId => {
      const index = columns.id.findIndex((id, i) => (columns.parentId[i] === tableRef && columns.colId[i] === colId));
      if (index === -1) { return null; }
      return Object.fromEntries(fields.map(f => [f, columns[f][index]]));
    });
  }

  constructor() {
    this._tableId = null;
    this._colIds = null;
    this._colTypesPromise = Promise.resolve([null, null]);
    this._accessLevel = 'full';
  }
  setAccessLevel(accessLevel) {
    this._accessLevel = accessLevel;
  }
  gotMappings(mappings) {
    // Can't fetch metadata when no full access.
    if (this._accessLevel !== 'full') { return; }
    if (!this._colIds || !(
        mappings.startDate === this._colIds[0] &&
        mappings.endDate === this._colIds[1] &&
        mappings.type === this._colIds[2]
      )) {
      this._colIds = [mappings.startDate, mappings.endDate, mappings.type];
      if (this._tableId) {
        this._colTypesPromise = ColTypesFetcher.getTypes(this._tableId, this._colIds);
      }
    }
  }
  gotNewMappings(tableId) {
    // Can't fetch metadata when no full access.
    if (this._accessLevel !== 'full') { return; }
    this._tableId = tableId;
    if (this._colIds) {
      this._colTypesPromise = ColTypesFetcher.getTypes(this._tableId, this._colIds);
    }
  }

  async getColTypes() {
    return this._colTypesPromise.then(types => types.map(t => t?.type));
  }

  async getColOptions() {
    return this._colTypesPromise.then(types => types.map(t => safeParse(t?.widgetOptions)));
  }
}

const colTypesFetcher = new ColTypesFetcher();

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([k, v]) => v !== undefined));
}

// Build body detail lines as an HTML string. Filters out empty/null values.
function buildBodyLines(body) {
  if (!body) return '';
  const lines = Array.isArray(body) ? body : [body];
  return lines
    .filter(v => v !== null && v !== undefined && v !== '')
    .map(v => `<span class="event-body-line">${escapeHtml(String(v))}</span>`)
    .join('');
}

// Build multi-line description blocks (up to 4 lines each) as an HTML string.
function buildDescriptionLines(description) {
  if (!description) return '';
  const lines = Array.isArray(description) ? description : [description];
  return lines
    .filter(v => v !== null && v !== undefined && v !== '')
    .map(v => `<span class="event-description-line">${escapeHtml(String(v))}</span>`)
    .join('');
}

// Build one or more initials badge(s) as an HTML string.
// initialsList and colorsList are arrays (already normalized in buildCalendarEventObject).
function buildInitialsBadges(initialsList, colorsList) {
  if (!initialsList || initialsList.length === 0) return '';
  const colors = colorsList || [];
  const badges = initialsList.map((init, i) => {
    const color = sanitizeCSSColor(colors[i]) || '#888888';
    return `<span class="event-initials-badge" style="background:${color}">${escapeHtml(String(init))}</span>`;
  }).join('');
  return `<span class="event-initials-group">${badges}</span>`;
}

// Only allow characters valid in CSS color values (hex, rgb, named colors, etc.)
function sanitizeCSSColor(color) {
  if (!color || typeof color !== 'string') return null;
  return /^[a-zA-Z0-9#()\s,%.+-]+$/.test(color.trim()) ? color.trim() : null;
}

// Escape HTML entities to prevent XSS in template strings.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// HACK: show Record Card popup on dblclick.
document.addEventListener('dblclick', async (ev) => {
  // tui calendar shows a popup on mouseup, and there is no way to customize it.
  // So we turn it off (by leaving useDetailPopup to false), and show the Record Card
  // popup ourselves.

  // Code that I read to make it happen:
  //
  // https://github.com/nhn/tui.calendar/blob/b53e765e8d896ab7c63d9b9b9515904119a72f46/apps/calendar/src/components/events/timeEvent.tsx#L233
  // if (isClick && useDetailPopup && eventContainerRef.current) {
  //   showDetailPopup(
  //     {
  //       event: uiModel.model,
  //       eventRect: eventContainerRef.current.getBoundingClientRect(),
  //     },
  //     false // this is flat parameter
  //   );
  // }

  // First some sanity checks.
  if (!ev.target || !calendarHandler.calendar) { return; }

  // Now find the uiModel.model parameter. This is typed as EventModel|null in the tui code.

  // First get the id of the event at hand.
  const eventDom = ev.target.closest("[data-event-id]");
  if (!eventDom) { return; }
  const eventId = Number(eventDom.dataset.eventId);
  if (!eventId || Number.isNaN(eventId)) { return; }

  // Now get the model from the calendar.
  const event = calendarHandler.calendar.getEventModel(eventId, CALENDAR_NAME);
  if (!event) { return; }

  // Now show the Record Card popup.
  await grist.setCursorPos({rowId: event.id});
  await grist.commandApi.run('viewAsCard');
});
