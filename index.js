require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const { mnemonicToPrivateKey } = require("@ton/crypto");
const { TonClient, WalletContractV4 } = require("@ton/ton");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TON_API_KEY = process.env.TON_API_KEY;
const TON_MNEMONIC = process.env.TON_MNEMONIC;
const API_KEY = process.env.API_KEY;

// TON connection (Using v2 endpoint)
const client = new TonClient({
    endpoint: "https://toncenter.com/api/v2/jsonRPC",
    apiKey: TON_API_KEY
});

const withdrawals = new Map();

// Home
app.get("/", (req, res) => {
    res.json({ status: "online", message: "TON AutoPay Backend Running" });
});

// Wallet check
app.get("/wallet-check", async (req, res) => {
    console.log("Accessing /wallet-check..."); // Debug log
    try {
        if (!TON_MNEMONIC) {
            return res.status(500).json({ success: false, message: "TON_MNEMONIC missing in .env" });
        }

        const words = TON_MNEMONIC.trim().split(/\s+/);
        const keyPair = await mnemonicToPrivateKey(words);

        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey
        });

        const balance = await client.getBalance(wallet.address);

        res.json({
            success: true,
            // .toString() on an address needs parameters to be user-friendly
            address: wallet.address.toString({ bounceable: false, testOnly: false }),
            balance_nanotons: balance.toString(),
            balance_ton: (Number(balance) / 1e9).toFixed(4)
        });

    } catch (error) {
        console.error("Wallet Check Error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Withdrawal request
app.post("/withdraw", (req, res) => {
    const auth = req.headers["x-api-key"];
    if (auth !== API_KEY) {
        return res.status(401).json({ success: false, message: "Invalid API key" });
    }

    const { user_id, wallet, amount } = req.body;
    if (!user_id || !wallet || !amount) {
        return res.status(400).json({ success: false, message: "Missing data" });
    }

    const id = crypto.randomUUID();
    withdrawals.set(id, { user_id, wallet, amount, status: "pending", created: new Date() });

    res.json({ success: true, withdrawal_id: id, message: "Withdrawal queued" });
});

// Withdrawal status
app.get("/withdraw/:id", (req, res) => {
    const data = withdrawals.get(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Test link: http://localhost:${PORT}/wallet-check`);
});
