export function weeklyDigestEmail({
  unsubscribeUrl,
  firstName,
  gpa,
  atRiskCourses,
  courses,
}: {
  unsubscribeUrl: string;
  firstName: string;
  gpa: number;
  atRiskCourses: { name: string; grade: number }[];
  courses: { name: string; grade: number }[];
}) {
  const gpaColor = gpa >= 3.5 ? "#10B981" : gpa >= 2.5 ? "#F59E0B" : "#EF4444";
  const atRiskHtml = atRiskCourses.length > 0
    ? `
      <div style="background:#FEF2F2;border-radius:12px;padding:16px;margin:16px 0;">
        <div style="color:#EF4444;font-weight:600;margin-bottom:8px;">⚠️ At-risk courses</div>
        ${atRiskCourses.map(c => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #FEE2E2;">
            <span style="color:#1E1040;">${c.name}</span>
            <span style="color:#EF4444;font-weight:600;">${c.grade}%</span>
          </div>
        `).join("")}
      </div>`
    : `<div style="background:#F0FDF4;border-radius:12px;padding:16px;margin:16px 0;color:#10B981;font-weight:500;">✅ No at-risk courses this week!</div>`;

  const coursesHtml = courses.map(c => {
    const color = c.grade >= 70 ? "#10B981" : c.grade >= 60 ? "#F59E0B" : "#EF4444";
    return `
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F3F0FF;">
        <span style="color:#1E1040;">${c.name}</span>
        <span style="color:${color};font-weight:600;">${c.grade > 0 ? c.grade + "%" : "N/A"}</span>
      </div>`;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F3FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:white;border-radius:24px;overflow:hidden;border:1px solid #EDE9FE;">
    
    <!-- Header -->
    <div style="background:#7C3AED;padding:32px;text-align:center;">
      <div style="color:white;font-size:22px;font-weight:600;">ampliscore</div>
      <div style="color:#DDD6FE;font-size:13px;margin-top:4px;">KNOW WHERE YOU STAND</div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <h1 style="color:#1E1040;font-size:20px;font-weight:600;margin:0 0 4px;">Hey ${firstName} 👋</h1>
      <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">Here's your weekly academic summary.</p>

      <!-- GPA Card -->
      <div style="background:#F5F3FF;border-radius:16px;padding:20px;text-align:center;margin-bottom:16px;">
        <div style="color:#7C3AED;font-size:13px;font-weight:500;margin-bottom:4px;">Current GPA</div>
        <div style="color:${gpaColor};font-size:48px;font-weight:700;line-height:1;">${gpa.toFixed(2)}</div>
      </div>

      <!-- At-risk -->
      ${atRiskHtml}

      <!-- All courses -->
      <div style="margin-top:24px;">
        <div style="color:#1E1040;font-weight:600;margin-bottom:8px;">Your courses</div>
        ${coursesHtml}
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-top:32px;">
        <a href="https://ampliscore.app/dashboard" 
           style="background:#7C3AED;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
          View full dashboard →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #F3F0FF;text-align:center;">
      <p style="color:#6B6480;font-size:12px;margin:0 0 8px 0;">You are receiving this because you have an Ampliscore account.</p>
      <p style="color:#6B6480;font-size:12px;margin:0 0 8px 0;"><a href="${unsubscribeUrl}" style="color:#7C3AED;">Unsubscribe from the weekly summary</a></p>
      <p style="color:#8E88A3;font-size:11px;margin:0;">© 2026 Ampliscore · <a href="https://ampliscore.app" style="color:#7C3AED;">ampliscore.app</a></p>
      <p style="color:#8E88A3;font-size:11px;margin:6px 0 0 0;">AMPLISCORE_POSTAL_ADDRESS</p>
    </div>
  </div>
</body>
</html>`;
}
