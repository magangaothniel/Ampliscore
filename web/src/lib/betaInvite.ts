import { randomInt } from "crypto";

// Ambiguous characters are left out on purpose. These codes get read off a
// screen and typed by hand, so O/0 and I/1 cause support mail.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateBetaCode(): string {
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `AMPLI-${body}`;
}

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function inviteHtml(firstName: string, code: string) {
  const redeem = `https://ampliscore.app/redeem?code=${encodeURIComponent(code)}`;
  return `
  <div style="background:#F5F3FF;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E5E2EF;border-radius:12px;padding:32px;">

      <p style="font-size:22px;font-weight:600;margin:0 0 4px 0;"><span style="color:#241A3E;">ampli</span><span style="color:#7C3AED;">score</span></p>
      <p style="color:#6B6480;font-size:13px;margin:0 0 26px 0;">Know where you stand.</p>

      <h1 style="color:#241A3E;font-size:21px;margin:0 0 14px 0;">You are in, ${esc(firstName)}</h1>

      <p style="color:#5B5470;font-size:15px;line-height:1.65;margin:0 0 18px 0;">
        Thanks for signing up to test Ampliscore. It tracks your GPA live, so
        instead of finding out where you landed in December, you see it move
        every time you enter a grade.
      </p>

      <p style="color:#5B5470;font-size:15px;line-height:1.65;margin:0 0 22px 0;">
        Here is your code. It unlocks Pro for free and works once.
      </p>

      <div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px;padding:20px;text-align:center;margin-bottom:22px;">
        <p style="color:#6B6480;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Your beta code</p>
        <p style="color:#241A3E;font-size:26px;font-weight:700;letter-spacing:3px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin:0;">${esc(code)}</p>
      </div>

      <a href="${redeem}" style="display:block;background:#7C3AED;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px;border-radius:8px;text-align:center;margin-bottom:10px;">
        Create your account and redeem
      </a>
      <p style="color:#6B6480;font-size:12px;text-align:center;margin:0 0 28px 0;">
        Make an account first, then the code applies to it.
      </p>

      <div style="border-top:1px solid #F1EFF7;padding-top:22px;">
        <h2 style="color:#241A3E;font-size:16px;margin:0 0 6px 0;">Where to start</h2>
        <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:0 0 14px 0;">
          Poke at anything you like, this is just a decent order. There is no
          need to finish it, and using the app normally for a week is more
          useful to me than working through a list.
        </p>
        <ol style="color:#5B5470;font-size:14px;line-height:1.85;margin:0;padding-left:20px;">
          <li>Add a real course with its actual grading categories, exams 40%, homework 25%, whatever your syllabus says</li>
          <li>Enter a few real scores and see whether the grade matches what your school says</li>
          <li>Check the GPA on your dashboard against what you expect</li>
          <li>Run an AI prediction on a course and judge whether the answer is useful or generic</li>
          <li>Use the GPA planner to work out what you need for a target</li>
          <li>Rate a professor you have actually had, and add a tip for succeeding in that class</li>
          <li>Try it on your phone, that is where most people will use it</li>
        </ol>
      </div>

      <div style="border-top:1px solid #F1EFF7;padding-top:22px;margin-top:24px;">
        <h2 style="color:#241A3E;font-size:16px;margin:0 0 6px 0;">What I actually need from you</h2>
        <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:0 0 14px 0;">
          Reply to this email whenever you have something. Blunt is better than
          polite, and one honest sentence beats a paragraph of encouragement.
        </p>
        <ul style="color:#5B5470;font-size:14px;line-height:1.85;margin:0;padding-left:20px;">
          <li>What did you like</li>
          <li>What did you not like, or what was confusing</li>
          <li>What is missing that you would want</li>
          <li>Would you keep using this next semester, and why or why not</li>
        </ul>
        <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:16px 0 0 0;">
          That last one matters most. If the answer is no, I would rather hear
          it now than find out in a year.
        </p>
      </div>

      <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:24px 0 0 0;">
        Pro stays on for you. Keep using the app as long as it is useful.
      </p>
      <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:14px 0 0 0;">
        Othniel
      </p>

      <p style="color:#8E88A3;font-size:11px;line-height:1.6;margin:26px 0 0 0;border-top:1px solid #F1EFF7;padding-top:16px;">
        You are getting this because you applied to test Ampliscore at
        ampliscore.app. Reply to this email if you would rather not take part.
      </p>
    </div>
  </div>`;
}
