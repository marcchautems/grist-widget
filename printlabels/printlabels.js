function ready(fn) {
  if (document.readyState !== 'loading'){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

const templates = [{
  id: 'labels8',
  name: '8 per sheet (2-1/3" x 3-3/8")',
  perPage: 8,
}, {
  id: 'labels10',
  name: '10 per sheet (2" x 4")',
  perPage: 10,
}, {
  id: 'labels20',
  name: '20 per sheet (1" x 4")',
  perPage: 20,
}, {
  id: 'labels30',
  name: '30 per sheet (1" x 2-5/8")',
  perPage: 30,
}, {
  id: 'labels60',
  name: '60 per sheet (1/2" x 1-3/4")',
  perPage: 60,
}, {
  id: 'labels80',
  name: '80 per sheet (1/2" x 1-3/4")',
  perPage: 80,
}, {
  id: 'a4labels24',
  name: 'A4 - 24 per sheet (33.9mm x 63.5mm) Avery3658',
  perPage: 24,
}, {
  id: 'a4labels189',
  name: 'A4 - 189 per sheet (10mm x 25.4mm, 7 cols)',
  perPage: 189,
}];

// For backward compatibility we will read starting template from a URL's hash or store, but
// this should not be used any more.
const defaultTemplate =
  findTemplate(document.location.hash.slice(1)) ||
  findTemplate('labels30');

function findTemplate(id) {
  return templates.find(t => t.id === id);
}

let app = undefined;
let data = {
  status: 'waiting',
  labels: null,
  template: defaultTemplate,
  showOptions: false,
  // Blanks, if positive, tells to leave this number of labels blank before starting to populate
  // them with data.
  blanks: 0,
  rows: null,
  // Inner padding of each label in mm.
  padTop: 2,
  padBottom: 2,
  padLeft: 2,
  padRight: 2,
  // Font styles per element: size in pt, color as hex, bold as boolean.
  titleSize: 12, titleColor: '#000000', titleBold: true,
  subtitleSize: 10, subtitleColor: '#000000', subtitleBold: false,
  detailSize: 8, detailColor: '#000000', detailBold: false,
  dateSize: 7, dateColor: '#555555', dateBold: false,
  topLeftSize: 7, topLeftColor: '#555555', topLeftBold: false,
  bottomLeftSize: 7, bottomLeftColor: '#555555', bottomLeftBold: false,
  // QR code size in mm.
  qrSize: 10,
  // Vertical offset of the center block in mm (positive = toward top, negative = toward bottom).
  centerOffset: 0,
  // Horizontal offset of the center block in mm (positive = toward right, negative = toward left).
  centerHOffset: 0
};

// Columns we expect
const LabelText = 'LabelText';
const LabelCount = 'LabelCount';
const LabelDate = 'LabelDate';
const LabelTopLeft = 'LabelTopLeft';
const LabelDetail = 'LabelDetail';
const LabelBottomLeft = 'LabelBottomLeft';
const LabelQR = 'LabelQR';
const LabelSubtitle = 'LabelSubtitle';

const emptyLabel = {text: "", subtitle: "", detail: "", date: "", topLeft: "", bottomLeft: "", qr: ""};

function arrangeLabels(labels, template, blanks) {
  const pages = [];
  let page = [];
  blanks = blanks || 0;
  for (let i = 0; i < blanks + labels.length; i++) {
    if (page.length >= template.perPage) {
      pages.push(page);
      page = [];
    }
    if (i < blanks) {
      page.push(emptyLabel);
    } else {
      const label = labels[i - blanks];
      if (label) {
        page.push(label);
      }
    }
  }
  while (page.length < template.perPage) {
    page.push(emptyLabel);
  }
  pages.push(page);
  return pages;
}

function formatDate(val) {
  if (!val) return '';
  // Grist Date/DateTime columns return Unix timestamps in seconds.
  if (typeof val === 'number') {
    const d = new Date(val * 1000);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return dd + '-' + mm;
  }
  return String(val);
}

function generateQR(text) {
  if (!text) return '';
  try {
    var qr = qrcode(0, 'L');
    qr.addData(String(text));
    qr.make();
    return qr.createDataURL(4, 0);
  } catch (e) {
    console.error('QR generation failed', e);
    return '';
  }
}

function handleError(err) {
  console.error('ERROR', err);
  const target = app || data;
  target.labels = null;
  target.status = String(err).replace(/^Error: /, '');
}

function updateRecords() {
  try {
    data.status = '';
    const rows = data.rows;
    if (!rows || !rows.length) {
      throw new Error("No data. Please add some rows");
    }
    if (!rows[0].hasOwnProperty(LabelText)) {
      throw new Error(`Please pick a column to show in the Creator Panel.`);
    }
    const haveCounts = rows[0].hasOwnProperty(LabelCount);
    const haveSubtitles = rows[0].hasOwnProperty(LabelSubtitle);
    const haveDetails = rows[0].hasOwnProperty(LabelDetail);
    const haveDates = rows[0].hasOwnProperty(LabelDate);
    const haveTopLeft = rows[0].hasOwnProperty(LabelTopLeft);
    const haveBottomLeft = rows[0].hasOwnProperty(LabelBottomLeft);
    const haveQR = rows[0].hasOwnProperty(LabelQR);
    const labels = [];
    for (const r of rows) {
      // parseFloat to be generous about the type of LabelCount. Text will be accepted.
      const count = haveCounts ? parseFloat(r[LabelCount]) : 1;
      const subtitle = haveSubtitles ? (r[LabelSubtitle] || '') : '';
      const detail = haveDetails ? (r[LabelDetail] || '') : '';
      const date = haveDates ? formatDate(r[LabelDate]) : '';
      const topLeft = haveTopLeft ? (r[LabelTopLeft] || '') : '';
      const bottomLeft = haveBottomLeft ? (r[LabelBottomLeft] || '') : '';
      const qr = haveQR ? generateQR(r[LabelQR]) : '';
      for (let i = 0; i < count; i++) {
        labels.push({text: r[LabelText], subtitle: subtitle, detail: detail, date: date, topLeft: topLeft, bottomLeft: bottomLeft, qr: qr});
      }
    }
    data.labels = labels;
  } catch (err) {
    handleError(err);
  }
}

// Page width before any scaling is applied.
let pageWidth = null;

function updateSize() {
  const page = document.querySelector('.page-outer');
  if (!page) { return; }
  if (!pageWidth) {
    pageWidth = page.getBoundingClientRect().width;
  }
  document.body.style.setProperty('--page-scaling', window.innerWidth / pageWidth);
}

ready(function() {
  grist.ready({
    requiredAccess: 'read table',
    columns: [
      {
        name: LabelText,
        title: "Label title",
        type: "Text"
      },
      {
        name: LabelDetail,
        title: "Label detail",
        type: "Any",
        optional: true
      },
      {
        name: LabelCount,
        title: "Label count",
        type: "Numeric",
        optional: true
      },
      {
        name: LabelDate,
        title: "Label date",
        type: "Any",
        optional: true
      },
      {
        name: LabelTopLeft,
        title: "Top left text",
        type: "Any",
        optional: true
      },
      {
        name: LabelBottomLeft,
        title: "Bottom left text",
        type: "Any",
        optional: true
      },
      {
        name: LabelSubtitle,
        title: "Label subtitle",
        type: "Any",
        optional: true
      },
      {
        name: LabelQR,
        title: "QR code link",
        type: "Any",
        optional: true
      }
    ]
  });
  // Listen to configuration change.
  grist.onOptions((options) => {
    if (options) {
      // Read saved options.
      data.template = findTemplate(options.template) || defaultTemplate;
      data.blanks = options.blanks || 0;
      data.padTop = options.padTop != null ? options.padTop : 2;
      data.padBottom = options.padBottom != null ? options.padBottom : 2;
      data.padLeft = options.padLeft != null ? options.padLeft : 2;
      data.padRight = options.padRight != null ? options.padRight : 2;
      // Font styles
      data.titleSize = options.titleSize != null ? options.titleSize : 12;
      data.titleColor = options.titleColor || '#000000';
      data.titleBold = options.titleBold != null ? options.titleBold : true;
      data.subtitleSize = options.subtitleSize != null ? options.subtitleSize : 10;
      data.subtitleColor = options.subtitleColor || '#000000';
      data.subtitleBold = options.subtitleBold != null ? options.subtitleBold : false;
      data.detailSize = options.detailSize != null ? options.detailSize : 8;
      data.detailColor = options.detailColor || '#000000';
      data.detailBold = options.detailBold != null ? options.detailBold : false;
      data.dateSize = options.dateSize != null ? options.dateSize : 7;
      data.dateColor = options.dateColor || '#555555';
      data.dateBold = options.dateBold != null ? options.dateBold : false;
      data.topLeftSize = options.topLeftSize != null ? options.topLeftSize : 7;
      data.topLeftColor = options.topLeftColor || '#555555';
      data.topLeftBold = options.topLeftBold != null ? options.topLeftBold : false;
      data.bottomLeftSize = options.bottomLeftSize != null ? options.bottomLeftSize : 7;
      data.bottomLeftColor = options.bottomLeftColor || '#555555';
      data.bottomLeftBold = options.bottomLeftBold != null ? options.bottomLeftBold : false;
      data.qrSize = options.qrSize != null ? options.qrSize : 10;
      data.centerOffset = options.centerOffset != null ? options.centerOffset : 0;
      data.centerHOffset = options.centerHOffset != null ? options.centerHOffset : 0;
    } else {
      // Revert to defaults.
      data.template = defaultTemplate;
      data.blanks = 0;
      data.padTop = 2; data.padBottom = 2; data.padLeft = 2; data.padRight = 2;
      data.titleSize = 12; data.titleColor = '#000000'; data.titleBold = true;
      data.subtitleSize = 10; data.subtitleColor = '#000000'; data.subtitleBold = false;
      data.detailSize = 8; data.detailColor = '#000000'; data.detailBold = false;
      data.dateSize = 7; data.dateColor = '#555555'; data.dateBold = false;
      data.topLeftSize = 7; data.topLeftColor = '#555555'; data.topLeftBold = false;
      data.bottomLeftSize = 7; data.bottomLeftColor = '#555555'; data.bottomLeftBold = false;
      data.qrSize = 10;
      data.centerOffset = 0;
      data.centerHOffset = 0;
    }
  })
  // Update the widget anytime the document data changes.
  grist.onRecords((rows) => {
    // We will fallback to reading rows directly to support
    // old widgets that didn't use column mappings.
    data.rows = grist.mapColumnNames(rows) || rows;
  });
  window.onresize = updateSize;

  Vue.config.errorHandler = handleError;
  app = new Vue({
    el: '#app',
    data: data,
    watch : {
      rows() {
        updateRecords();
      }
    },
    computed: {
      appStyle() {
        return {
          '--label-pad-top': this.padTop + 'mm',
          '--label-pad-bottom': this.padBottom + 'mm',
          '--label-pad-left': this.padLeft + 'mm',
          '--label-pad-right': this.padRight + 'mm',
          '--title-size': this.titleSize + 'pt',
          '--title-color': this.titleColor,
          '--title-weight': this.titleBold ? 'bold' : 'normal',
          '--subtitle-size': this.subtitleSize + 'pt',
          '--subtitle-color': this.subtitleColor,
          '--subtitle-weight': this.subtitleBold ? 'bold' : 'normal',
          '--detail-size': this.detailSize + 'pt',
          '--detail-color': this.detailColor,
          '--detail-weight': this.detailBold ? 'bold' : 'normal',
          '--date-size': this.dateSize + 'pt',
          '--date-color': this.dateColor,
          '--date-weight': this.dateBold ? 'bold' : 'normal',
          '--top-left-size': this.topLeftSize + 'pt',
          '--top-left-color': this.topLeftColor,
          '--top-left-weight': this.topLeftBold ? 'bold' : 'normal',
          '--bottom-left-size': this.bottomLeftSize + 'pt',
          '--bottom-left-color': this.bottomLeftColor,
          '--bottom-left-weight': this.bottomLeftBold ? 'bold' : 'normal',
          '--qr-size': this.qrSize + 'mm',
          '--center-offset': (-this.centerOffset) + 'mm',
          '--center-hoffset': this.centerHOffset + 'mm'
        };
      }
    },
    methods: {
      arrangeLabels,
      formatDate,
      async save() {
        // Custom save handler to save only when user changed the value.
        await grist.widgetApi.setOption('template', this.template.id);
        await grist.widgetApi.setOption('blanks', this.blanks);
        await grist.widgetApi.setOption('padTop', this.padTop);
        await grist.widgetApi.setOption('padBottom', this.padBottom);
        await grist.widgetApi.setOption('padLeft', this.padLeft);
        await grist.widgetApi.setOption('padRight', this.padRight);
        // Font styles
        const fontKeys = [
          'titleSize', 'titleColor', 'titleBold',
          'subtitleSize', 'subtitleColor', 'subtitleBold',
          'detailSize', 'detailColor', 'detailBold',
          'dateSize', 'dateColor', 'dateBold',
          'topLeftSize', 'topLeftColor', 'topLeftBold',
          'bottomLeftSize', 'bottomLeftColor', 'bottomLeftBold'
        ];
        for (const k of fontKeys) {
          await grist.widgetApi.setOption(k, this[k]);
        }
        await grist.widgetApi.setOption('qrSize', this.qrSize);
        await grist.widgetApi.setOption('centerOffset', this.centerOffset);
        await grist.widgetApi.setOption('centerHOffset', this.centerHOffset);
      }
    },
    updated: () => setTimeout(updateSize, 0),
  });
});
