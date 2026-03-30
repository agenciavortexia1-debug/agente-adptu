import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for sending emails
  app.post("/api/email", async (req, res) => {
    const { to, subject, html, gmailUser, gmailAppPassword } = req.body;

    if (!gmailUser || !gmailAppPassword) {
      return res.status(400).json({ error: "Missing Gmail credentials" });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });

      await transporter.sendMail({
        from: gmailUser,
        to,
        subject,
        html,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Background check for deadlines (simulating Cron)
  // In a real app, this would be a separate process or a real Cron job
  setInterval(async () => {
    console.log("Checking deadlines...");
    // This is a simplified version since we don't have a DB here, 
    // we rely on the client to send the goals or we'd need a server-side store.
    // For MVP, we'll let the client trigger the check or just provide the endpoint.
  }, 1000 * 60 * 60 * 24); // Once a day

  app.post("/api/check-deadlines", async (req, res) => {
    const { goals, gmailUser, gmailAppPassword, userName } = req.body;
    
    if (!goals || !gmailUser || !gmailAppPassword) {
      return res.status(400).json({ error: "Missing data" });
    }

    const results = [];
    const today = new Date();

    for (const goal of goals) {
      if (goal.status === 'completed') continue;
      
      const deadline = new Date(goal.deadline);
      const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Trigger: 3 days before and on the day
      if (diffDays === 3 || diffDays === 0) {
        try {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: gmailUser, pass: gmailAppPassword },
          });

          await transporter.sendMail({
            from: gmailUser,
            to: gmailUser, // Sending to self as per briefing
            subject: `⏰ Adaptu: "${goal.description}" vence em ${diffDays} dias`,
            html: `
              <div style="font-family: sans-serif; color: #1A1A18; max-width: 600px; margin: 0 auto; border: 1px solid #E4E0D8; border-radius: 16px; padding: 32px;">
                <h2 style="font-family: serif; color: #2D6A4F;">Olá, ${userName}</h2>
                <p>Seu sócio Adaptu passando para te cobrar.</p>
                <div style="background: #F7F6F2; padding: 24px; border-radius: 12px; margin: 24px 0;">
                  <strong style="display: block; margin-bottom: 8px; color: #2D6A4F; text-transform: uppercase; font-size: 12px;">Meta em foco:</strong>
                  <span style="font-size: 18px;">${goal.description}</span>
                  <p style="margin-top: 12px; font-size: 14px; color: #7A7870;">
                    Prazo: ${new Date(goal.deadline).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <p style="font-size: 14px; line-height: 1.6;">
                  Faltam <strong>${diffDays} dias</strong>. Como está o progresso? Não deixe para a última hora.
                </p>
                <hr style="border: 0; border-top: 1px solid #E4E0D8; margin: 32px 0;" />
                <p style="font-size: 12px; color: #B8B4AA; text-align: center;">
                  Adaptu — Seu Sócio Estratégico
                </p>
              </div>
            `,
          });
          results.push({ goal: goal.description, status: "sent" });
        } catch (err: any) {
          results.push({ goal: goal.description, status: "error", error: err.message });
        }
      }
    }

    res.json({ results });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
