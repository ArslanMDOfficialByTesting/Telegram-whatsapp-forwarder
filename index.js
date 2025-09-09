// index.js
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import express from "express";

const GROUP_JID = "120363421029213526@g.us"; // ✅ Your WhatsApp group JID
const PAIR_NUMBER = process.env.PAIR_NUMBER || null;

let sock; // global socket

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection } = update;

    if (connection === "open") {
      console.log("✅ WhatsApp Connected Successfully!");
    }

    if (connection === "close") {
      console.log("❌ Connection closed. Retrying in 5s...");
      setTimeout(startBot, 5000);
    }

    if (update.qr && PAIR_NUMBER) {
      try {
        let code = await sock.requestPairingCode(PAIR_NUMBER);
        console.log(
          `📌 Pairing Code for ${PAIR_NUMBER}: ${code}\n👉 WhatsApp → Linked Devices → Link with phone number`
        );
      } catch (err) {
        console.error("❌ Failed to generate pairing code:", err);
      }
    }
  });

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
}

// ✅ Start WhatsApp Bot
startBot();

// ✅ Express API (sirf ek dafa start hoga)
const app = express();
app.use(express.json());

app.post("/send", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }
    if (!sock) {
      return res.status(500).json({ error: "WhatsApp not connected" });
    }
    await sock.sendMessage(GROUP_JID, { text: message });
    return res.json({ success: true, sent: message });
  } catch (err) {
    console.error("Send error:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Forwarder API running on port ${PORT}`);
});
