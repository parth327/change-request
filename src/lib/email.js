const { brevoApiKey, emailFromAddress, emailFromName } = require("../config/env");
const { escapeHtml, formatDate } = require("./utils");

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

async function sendEmail({ to, subject, html }) {
  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "api-key": brevoApiKey
    },
    body: JSON.stringify({
      sender: { email: emailFromAddress, name: emailFromName },
      to,
      subject,
      htmlContent: html
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo send failed (${res.status}): ${body}`);
  }
}

function layout(title, bodyHtml) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#F6F5F1; padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #DAD5CA;border-radius:4px;overflow:hidden;">
      <div style="background:#1B2430;padding:20px 28px;">
        <span style="color:#F6F5F1;font-size:13px;letter-spacing:0.02em;">CLIMS &middot; Change Request Portal</span>
      </div>
      <div style="padding:28px;color:#1B2430;">
        <h1 style="font-size:19px;margin:0 0 16px;">${escapeHtml(title)}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #DAD5CA;color:#626B78;font-size:12px;">
        This is an automated message from the Contractor Labour Information Management System.
      </div>
    </div>
  </div>`;
}

function summaryTable(fields) {
  const rows = fields
    .map(
      (f) => `
      <tr>
        <td style="padding:8px 0;color:#626B78;font-size:13px;width:160px;vertical-align:top;">${escapeHtml(f.label)}</td>
        <td style="padding:8px 0;color:#1B2430;font-size:14px;white-space:pre-wrap;">${escapeHtml(f.value)}</td>
      </tr>`
    )
    .join("");
  return `<table style="width:100%;border-top:1px solid #DAD5CA;border-bottom:1px solid #DAD5CA;margin:16px 0;">${rows}</table>`;
}

async function sendSubmitterConfirmation({ submitterEmail, refCode, changeDate, description, reason }) {
  const html = layout(
    "We received your change request",
    `<p style="font-size:14px;line-height:1.5;">Reference <strong>${escapeHtml(refCode)}</strong> is now pending approval. You'll get another email as soon as a decision is made.</p>
     ${summaryTable([
       { label: "Reference", value: refCode },
       { label: "Date of change", value: formatDate(changeDate) },
       { label: "Description", value: description },
       { label: "Reason", value: reason || "—" }
     ])}`
  );
  await sendEmail({ to: [{ email: submitterEmail }], subject: `Received: change request ${refCode}`, html });
}

async function sendRecipientReviewRequest({
  recipientEmail,
  recipientName,
  refCode,
  submitterEmail,
  changeDate,
  description,
  reason,
  reviewUrl
}) {
  const html = layout(
    "A change request needs your review",
    `<p style="font-size:14px;line-height:1.5;">Submitted by ${escapeHtml(submitterEmail)}.</p>
     ${summaryTable([
       { label: "Reference", value: refCode },
       { label: "Date of change", value: formatDate(changeDate) },
       { label: "Description", value: description },
       { label: "Reason", value: reason || "—" }
     ])}
     <p style="text-align:center;margin:24px 0;">
       <a href="${reviewUrl}" style="background:#C1631A;color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:4px;font-size:14px;display:inline-block;">Review request</a>
     </p>
     <p style="font-size:12px;color:#626B78;">If the button doesn't work, copy this link: ${escapeHtml(reviewUrl)}</p>`
  );
  await sendEmail({
    to: [{ email: recipientEmail, name: recipientName }],
    subject: `Review needed: change request ${refCode}`,
    html
  });
}

async function sendDecisionEmail({ submitterEmail, refCode, decision, decidedByName, comment }) {
  const isApproved = decision === "APPROVED";
  const html = layout(
    `Your change request was ${isApproved ? "approved" : "rejected"}`,
    `<p style="font-size:14px;line-height:1.5;">Reference <strong>${escapeHtml(refCode)}</strong> was <strong style="color:${
      isApproved ? "#206B45" : "#9C2B2B"
    };">${isApproved ? "approved" : "rejected"}</strong> by ${escapeHtml(decidedByName)}.</p>
     ${
       comment
         ? `<div style="margin-top:12px;padding:12px 14px;background:#ECEAE4;border-radius:4px;font-size:14px;white-space:pre-wrap;"><strong>Comment:</strong> ${escapeHtml(comment)}</div>`
         : ""
     }`
  );
  await sendEmail({
    to: [{ email: submitterEmail }],
    subject: `${isApproved ? "Approved" : "Rejected"}: change request ${refCode}`,
    html
  });
}

module.exports = { sendSubmitterConfirmation, sendRecipientReviewRequest, sendDecisionEmail };
