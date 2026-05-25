import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "1200px", height: "630px", background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ background: "white", borderRadius: "32px", padding: "80px 100px", display: "flex", flexDirection: "column", alignItems: "center", border: "1px solid #EDE9FE", width: "1080px" }}>

          {/* Logo text only - clean and simple */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "40px" }}>
            <div style={{ display: "flex", fontSize: "52px", fontWeight: "800", letterSpacing: "-1px" }}>
              <span style={{ color: "#1E1040" }}>ampli</span>
              <span style={{ color: "#7C3AED" }}>score</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "64px", fontWeight: "800", color: "#1E1040", textAlign: "center", lineHeight: 1.15 }}>
              Know where you stand,
            </div>
            <div style={{ fontSize: "64px", fontWeight: "800", color: "#7C3AED", textAlign: "center", lineHeight: 1.15 }}>
              every semester
            </div>
          </div>

          <div style={{ display: "flex", fontSize: "26px", color: "#6B7280", textAlign: "center", marginBottom: "44px" }}>
            Grade tracker · GPA planner · Professor ratings
          </div>

          <div style={{ display: "flex", gap: "14px" }}>
            {["Free to start", "500+ universities", "AI grade predictor"].map((text) => (
              <div key={text} style={{ display: "flex", background: "#F5F3FF", color: "#7C3AED", padding: "12px 24px", borderRadius: "100px", fontSize: "20px", fontWeight: "600", border: "1px solid #DDD6FE" }}>
                {text}
              </div>
            ))}
          </div>

        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
