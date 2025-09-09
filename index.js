import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys"
import express from "express"

const app = express()
app.use(express.json())

let sock

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info")
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    })

    sock.ev.on("creds.update", saveCreds)
    sock.ev.on("connection.update", (update) => {
        if (update.connection === "open") {
            console.log("✅ WhatsApp connected!")
        }
    })
}

app.post("/send", async (req, res) => {
    const text = req.body.text
    const groupJid = "1203630xxxxx-123456@g.us" // ⚡ Apna WhatsApp group JID daalo

    try {
        await sock.sendMessage(groupJid, { text })
        res.json({ success: true })
    } catch (e) {
        res.json({ success: false, error: e.message })
    }
})

app.listen(5000, () => console.log("🚀 WhatsApp Forwarder API running on 5000"))
connectToWhatsApp()
