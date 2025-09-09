// index.js
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import express from "express";
import qrcode from "qrcode";

const GROUP_JID = "120363421029213526@g.us"; // WhatsApp group
const PORT = process.env.PORT || 5000;

let sock; // global socket

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr } = update;

    if (connection === "open") {
      console.log("✅ WhatsApp Connected Successfully!");
    }

    if (connection === "close") {
      console.log("❌ Connection closed. Retrying in 5s...");
      setTimeout(startBot, 5000);
    }

    if (qr) {
      // Save QR in memory
      sock.qr = qr;
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Command: .jid
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || !msg.key.remoteJid) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    if (text.toLowerCase() === ".jid") {
      await sock.sendMessage(from, { text: `🆔 JID: ${from}` });
    }
  });
}

// Start bot
startBot();

// Express server
const app = express();
app.use(express.json());

// QR endpoint
app.get("/qr", async (req, res) => {
  if (!sock?.qr) return res.status(404).send("No QR available yet.");
  try {
    const qrImage = await qrcode.toDataURL(sock.qr);
    const html = `<img src="${qrImage}" /><p>Scan with WhatsApp → Linked Devices → Link with Phone</p>`;
    res.send(html);
  } catch (err) {
    res.status(500).send("Failed to generate QR");
  }
});

// POST /send → always forward to your group
app.post("/send", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message is required" });
    if (!sock) return res.status(500).json({ error: "WhatsApp not connected" });

    await sock.sendMessage(GROUP_JID, { text: message });
    return res.json({ success: true, sent: message });
  } catch (err) {
    console.error("Send error:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Forwarder API running on port ${PORT}`);
  console.log(`📌 Open /qr to scan QR: http://localhost:${PORT}/qr`);
});
