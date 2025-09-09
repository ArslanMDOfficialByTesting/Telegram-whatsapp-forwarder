// index.js
import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import express from "express";

const GROUP_JID = "120363421029213526@g.us"; // ✅ Your WhatsApp group JID

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  // ✅ Handle QR Code
  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;
    if (qr) {
      console.log("📌 Scan this QR Code with WhatsApp:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      console.log("✅ WhatsApp Connected Successfully!");
    }
  });

  // ✅ Save session
  sock.ev.on("creds.update", saveCreds);

  // ✅ Command: .jid
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || !msg.key.remoteJid) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (text.toLowerCase() === ".jid") {
      await sock.sendMessage(from, { text: `🆔 JID: ${from}` });
    }
  });

  // ✅ Express API
  const app = express();
  app.use(express.json());

  // POST /send → Always forward to your group
  app.post("/send", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }
      await sock.sendMessage(GROUP_JID, { text: message });
      return res.json({ success: true, sent: message });
    } catch (err) {
      console.error("Send error:", err);
      return res.status(500).json({ error: "Failed to send message" });
    }
  });

  // ✅ Start API server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 WhatsApp Forwarder API running on port ${PORT}`);
  });
}

startBot();
