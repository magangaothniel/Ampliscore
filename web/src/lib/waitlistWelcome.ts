const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function waitlistWelcomeHtml(
  name: string,
  email: string,
  unsubToken: string
) {
  const first = esc(String(name || "").split(" ")[0] || "there");
  const unsub = `https://ampliscore.app/api/waitlist/leave?e=${encodeURIComponent(email)}&t=${unsubToken}`;

  return `
  <div style="background:#F5F3FF;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E5E2EF;border-radius:12px;padding:32px;">

      <p style="font-size:22px;font-weight:600;margin:0 0 4px 0;"><span style="color:#241A3E;">ampli</span><span style="color:#7C3AED;">score</span></p>
      <p style="color:#6B6480;font-size:13px;margin:0 0 26px 0;">Know where you stand.</p>

      <h1 style="color:#241A3E;font-size:21px;margin:0 0 14px 0;">Here is what you signed up for, ${first}</h1>

      <p style="color:#5B5470;font-size:15px;line-height:1.65;margin:0 0 22px 0;">
        You know your GPA in August. Then you are blind until December. Every
        assignment in between moves it, and you have no idea which way until
        the semester is already over.
      </p>

      <p style="color:#5B5470;font-size:15px;line-height:1.65;margin:0 0 24px 0;">
        Ampliscore fixes that. Here is what you get.
      </p>

      <div style="border-top:1px solid #F1EFF7;padding-top:22px;margin-bottom:8px;">
        <p style="color:#241A3E;font-size:15px;font-weight:600;margin:0 0 4px 0;">A GPA that updates as you go</p>
        <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:0 0 18px 0;">
          Put in your syllabus weights once. Every grade you enter moves your
          real GPA, so you always know where you stand.
        </p>

        <p style="color:#241A3E;font-size:15px;font-weight:600;margin:0 0 4px 0;">A prediction before it is too late</p>
        <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:0 0 18px 0;">
          AI reads your grades so far and tells you where the course is heading
          and what you need on what is left.
        </p>

        <p style="color:#241A3E;font-size:15px;font-weight:600;margin:0 0 4px 0;">What-if planning</p>
        <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:0 0 18px 0;">
          Set a target GPA and work backwards. Find out what each class actually
          needs to be, before you are guessing in finals week.
        </p>

        <p style="color:#241A3E;font-size:15px;font-weight:600;margin:0 0 4px 0;">Professor ratings that are useful</p>
        <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:0 0 6px 0;">
          Scoped to your school, with tips on how to actually pass the class,
          not just whether the professor is nice.
        </p>
      </div>

      <div style="border-top:1px solid #F1EFF7;padding-top:24px;margin-top:20px;">
        <p style="color:#241A3E;font-size:16px;font-weight:600;margin:0 0 8px 0;">You do not have to wait</p>
        <p style="color:#5B5470;font-size:15px;line-height:1.65;margin:0 0 20px 0;">
          You joined the list for the mobile app, and you will be the first to
          hear when it ships. But the web version is live today and it works on
          your phone browser. Set up your fall courses now and you start the
          semester already tracking, instead of catching up in October.
        </p>
        <a href="https://ampliscore.app/register" style="display:block;background:#7C3AED;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px;border-radius:8px;text-align:center;">
          Set up your fall semester
        </a>
        <p style="color:#6B6480;font-size:12px;text-align:center;margin:10px 0 0 0;">
          Free to start. Your account carries over to the app.
        </p>
      </div>

      <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:26px 0 0 0;">
        If something is broken or missing, reply to this email. I built this on
        my own and I read everything that comes back.
      </p>
      <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:14px 0 0 0;">
        Othniel
      </p>

      <p style="color:#8E88A3;font-size:11px;line-height:1.6;margin:26px 0 0 0;border-top:1px solid #F1EFF7;padding-top:16px;">
        You are getting this because you joined the waitlist at ampliscore.app.
        <a href="${unsub}" style="color:#7C3AED;">Leave the list</a>
      </p>
    </div>
  </div>`;
}
