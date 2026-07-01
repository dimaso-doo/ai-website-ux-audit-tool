import PDFDocument from "pdfkit";

export async function createReportPdf(params: {
  websiteUrl: string;
  report: string;
  title?: string;
  footerLabel?: string;
}) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const title = params.title || "AI Website UX Audit";
    const footerLabel = params.footerLabel || "Dimaso internal audit";
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      bufferPages: true,
      info: {
        Title: title,
        Author: "Dimaso",
      },
    });

    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(20).fillColor("#0f172a").text(title, {
      align: "left",
    });
    doc.moveDown(0.35);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#334155").text(`Website reviewed: ${params.websiteUrl || "Not provided"}`);
    doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown(1);
    doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(48, doc.y).lineTo(547, doc.y).stroke();
    doc.moveDown(1);

    const lines = params.report.replace(/\r\n/g, "\n").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        doc.moveDown(0.45);
        continue;
      }

      if (/^#{1,3}\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
        ensureSpace(doc, 42);
        doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a").text(trimmed.replace(/^#{1,3}\s+/, ""), {
          paragraphGap: 4,
        });
        continue;
      }

      if (/^- /.test(trimmed)) {
        ensureSpace(doc, 24);
        doc.font("Helvetica").fontSize(9).fillColor("#334155").text(`- ${trimmed.replace(/^- /, "")}`, {
          indent: 12,
          paragraphGap: 2,
          lineGap: 1.5,
        });
        continue;
      }

      ensureSpace(doc, 30);
      doc.font("Helvetica").fontSize(9.5).fillColor("#1e293b").text(trimmed, {
        paragraphGap: 3,
        lineGap: 1.5,
      });
    }

    const pageRange = doc.bufferedPageRange();
    for (let offset = 0; offset < pageRange.count; offset += 1) {
      doc.switchToPage(pageRange.start + offset);
      doc.font("Helvetica").fontSize(8).fillColor("#64748b").text(`${footerLabel} - Page ${offset + 1}`, 48, 782, {
        align: "center",
        lineBreak: false,
        width: 499,
      });
    }

    doc.flushPages();
    doc.end();
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > 790) {
    doc.addPage();
  }
}
