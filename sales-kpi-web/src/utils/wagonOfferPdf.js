import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const text = (value) => String(value || "").trim();
const textOrDash = (value) => text(value) || "-";
const fileSafe = (value) => String(value || "project").replace(/[\\/:*?"<>|]+/g, "_");

const formatDate = (value) => {
  const raw = text(value);
  if (!raw) {
    return "";
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return raw;
  }

  return `${match[3]}.${match[2]}.${match[1]}`;
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toHtmlLines = (values, fallback = "-") => {
  const cleanValues = values.map(text).filter(Boolean);
  return cleanValues.length ? cleanValues.map(escapeHtml).join("<br/>") : escapeHtml(fallback);
};

const repeatMakeLines = (make, count) => {
  const cleanMake = text(make);
  if (!cleanMake) {
    return ["-"];
  }

  return new Array(Math.max(count, 1)).fill(cleanMake);
};

const linkedComponentLines = (row, key, field) => {
  const values = (row?.linkedWheelDataRows || [])
    .flatMap((item) => {
      const data = item?.secondZone?.[key];
      if (!data) {
        return [];
      }

      return field === "make" ? [data.make] : data.serialNumbers || [];
    })
    .map(text)
    .filter(Boolean);

  return values.length ? values : ["-"];
};

const contractPoSummary = (project) => {
  const parts = [text(project.contractPoNumber)];
  const poDate = formatDate(project.contractPoDate);
  const dpDate = formatDate(project.deliveryPeriodUpto);

  if (poDate) {
    parts.push(`Dtd-${poDate}`);
  }
  if (dpDate) {
    parts.push(`D.P-${dpDate}`);
  }

  return parts.filter(Boolean).join(" ");
};

const totalQuantitySummary = (project) => {
  const quantity = text(project.totalQuantity);
  const wagonType = text(project.wagonTypeInPo);
  return [quantity, wagonType].filter(Boolean).join("+") || "-";
};

const offeredSummary = (project, rows) => {
  const countText = text(project.wagonsOfferedForInspection) || `${rows.length} Nos`;
  const dateText = formatDate(project.inspectionOfferDate);
  return dateText ? `${countText} Dtd ${dateText}` : countText;
};

const wagonCellLines = (row) => {
  const lines = [text(row?.wagonConfiguration), text(row?.wagonNo)].filter(Boolean);
  return lines.length ? lines : ["-"];
};

const bodyRowMarkup = (row, index) => {
  const bogieSerialNumbers = [row?.firstZone?.bogie1SerialNumber, row?.firstZone?.bogie2SerialNumber].map(text).filter(Boolean);
  const couplerSerialNumbers = Array.isArray(row?.firstZone?.coupler?.serialNumbers)
    ? row.firstZone.coupler.serialNumbers
    : [];
  const draftGearSerialNumbers = Array.isArray(row?.firstZone?.draftGear?.serialNumbers)
    ? row.firstZone.draftGear.serialNumbers
    : [];

  const cells = [
    { html: escapeHtml(text(row?.slNo || index + 1) || "-"), className: "sn-cell" },
    { html: `<strong>${toHtmlLines(wagonCellLines(row))}</strong>`, className: "wagon-cell" },
    { html: toHtmlLines(repeatMakeLines(row?.firstZone?.bogie?.make, bogieSerialNumbers.length || 2)) },
    { html: toHtmlLines(bogieSerialNumbers) },
    { html: toHtmlLines(repeatMakeLines(row?.firstZone?.coupler?.make, couplerSerialNumbers.length || 2)) },
    { html: toHtmlLines(couplerSerialNumbers) },
    { html: escapeHtml(textOrDash(row?.firstZone?.dv?.make)) },
    { html: toHtmlLines(row?.firstZone?.dv?.serialNumbers || []) },
    { html: toHtmlLines(linkedComponentLines(row, "bearing", "make")) },
    { html: toHtmlLines(linkedComponentLines(row, "bearing", "serialNumbers")) },
    { html: escapeHtml(textOrDash(row?.firstZone?.bc?.make)) },
    { html: toHtmlLines(row?.firstZone?.bc?.serialNumbers || []) },
    { html: toHtmlLines(repeatMakeLines(row?.firstZone?.draftGear?.make, draftGearSerialNumbers.length || 2)) },
    { html: toHtmlLines(draftGearSerialNumbers) },
    { html: escapeHtml(textOrDash(row?.firstZone?.crfMake)) },
    { html: `<strong>${escapeHtml(textOrDash(row?.texNo))}</strong>` },
  ];

  return `
    <tr>
      ${cells.map((cell) => `<td class="${cell.className || ""}">${cell.html}</td>`).join("")}
    </tr>
  `;
};

const buildMarkup = (project, rows) => `
  <div class="wagon-offer-pdf">
    <table class="meta-table">
      <tr>
        <th>Contract/P.O. No. and date and D.P. (Upto)</th>
        <td>${escapeHtml(contractPoSummary(project))}</td>
      </tr>
      <tr>
        <th>Total Quantity/type of Wagon in PO</th>
        <td>${escapeHtml(totalQuantitySummary(project))}</td>
      </tr>
      <tr>
        <th>Contract/P.O. placed by</th>
        <td>${escapeHtml(textOrDash(project.contractPlacedBy))}</td>
      </tr>
      <tr>
        <th>Name of the wagon manufacturer</th>
        <td>${escapeHtml(textOrDash(project.wagonManufacturer))}</td>
      </tr>
      <tr>
        <th>Type of Wagon offered</th>
        <td>${escapeHtml(textOrDash(project.wagonTypeOffered || project.wagonTypeInPo))}</td>
      </tr>
      <tr>
        <th>No of Wagons offered for Inspection (Up to 20 wagons)</th>
        <td>${escapeHtml(offeredSummary(project, rows))}</td>
      </tr>
    </table>

    <table class="offer-table">
      <thead>
        <tr>
          <th colspan="16" class="title-cell">Details of offered Wagons</th>
        </tr>
        <tr>
          <th rowspan="2" class="sn-header">S.N.</th>
          <th rowspan="2" class="wagon-header">Wagon No.</th>
          <th colspan="2">Bogie</th>
          <th colspan="2">Coupler</th>
          <th colspan="2">DV</th>
          <th colspan="2">Bearing</th>
          <th colspan="2">Brake Cylinder</th>
          <th colspan="2">Draft Gear</th>
          <th rowspan="2">CRF Make</th>
          <th rowspan="2">TEX NO</th>
        </tr>
        <tr>
          <th>Make</th>
          <th>Sr. No.</th>
          <th>Make</th>
          <th>Sr. No.</th>
          <th>Make</th>
          <th>Sr. No.</th>
          <th>Make</th>
          <th>Sr. No.</th>
          <th>Make</th>
          <th>Sr. No.</th>
          <th>Make</th>
          <th>Sr. No.</th>
        </tr>
      </thead>
      <tbody>
        ${rows.length ? rows.map(bodyRowMarkup).join("") : '<tr><td colspan="16" class="empty-row">No wagons added.</td></tr>'}
      </tbody>
    </table>
  </div>
`;

const buildContainer = (project, rows) => {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "-10000px";
  root.style.top = "0";
  root.style.width = "1800px";
  root.style.background = "#ffffff";
  root.style.padding = "24px";
  root.style.zIndex = "-1";
  root.innerHTML = `
    <style>
      .wagon-offer-pdf {
        font-family: "Times New Roman", Times, serif;
        color: #000;
        background: #fff;
      }
      .wagon-offer-pdf table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .wagon-offer-pdf th,
      .wagon-offer-pdf td {
        border: 1px solid #000;
        padding: 4px 5px;
        font-size: 12px;
        line-height: 1.3;
        vertical-align: middle;
        text-align: center;
        word-break: break-word;
      }
      .wagon-offer-pdf .meta-table {
        margin-bottom: 0;
      }
      .wagon-offer-pdf .meta-table th,
      .wagon-offer-pdf .meta-table td {
        font-size: 13px;
      }
      .wagon-offer-pdf .meta-table th {
        width: 52%;
        font-weight: 700;
        text-align: left;
      }
      .wagon-offer-pdf .meta-table td {
        width: 48%;
        text-align: left;
      }
      .wagon-offer-pdf .offer-table {
        margin-top: -1px;
      }
      .wagon-offer-pdf .offer-table thead th {
        font-weight: 700;
      }
      .wagon-offer-pdf .title-cell {
        font-size: 15px;
        padding: 2px 0;
      }
      .wagon-offer-pdf .sn-header {
        width: 4%;
      }
      .wagon-offer-pdf .wagon-header {
        width: 12%;
      }
      .wagon-offer-pdf .sn-cell {
        font-size: 13px;
        font-weight: 700;
      }
      .wagon-offer-pdf .wagon-cell {
        font-size: 13px;
        line-height: 1.45;
      }
      .wagon-offer-pdf tbody td {
        white-space: pre-line;
      }
      .wagon-offer-pdf .empty-row {
        padding: 16px 8px;
      }
    </style>
    ${buildMarkup(project, rows)}
  `;

  return root;
};

export async function downloadWagonOfferPdf(project, rows) {
  const root = buildContainer(project, rows);
  document.body.appendChild(root);

  try {
    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: root.scrollWidth,
      windowHeight: root.scrollHeight,
    });

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    while (heightLeft > 0) {
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      position -= pdfHeight;
      if (heightLeft > 0) {
        pdf.addPage();
      }
    }

    pdf.save(`Wagon Offer Copy - ${fileSafe(project.projectName)}.pdf`);
  } finally {
    document.body.removeChild(root);
  }
}
