require("dotenv").config();
const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// Updated Constants
const MIN_WITHDRAW = 0.03;
const WITHDRAW_FEE = 0.01;

const withdrawals = new Map();

app.get("/", (req, res) => {
    res.json({ status: "online", message: "TON AutoPay Backend Running" });
});

app.post("/withdraw", async (req, res) => {
    try {
        const key = req.headers["x-api-key"];
        if (key !== API_KEY) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { user_id, wallet, amount, request_id } = req.body;

        // 1. Basic Validation
        if (!user_id || !wallet || !amount) {
            return res.status(400).json({ success: false, message: "Missing user_id, wallet or amount" });
        }

        const withdrawAmount = parseFloat(amount);

        // 2. Minimum Withdrawal Check
        if (withdrawAmount < MIN_WITHDRAW) {
            return res.status(400).json({
                success: false,
                message: `Minimum withdrawal is ${MIN_WITHDRAW} TON`
            });
        }

        // 3. Duplicate Prevention Logic
        // We use request_id sent from the frontend to ensure the same click doesn't pay twice
        const dedupeKey = request_id || `${user_id}_${withdrawAmount}_${wallet}`; 
        if (withdrawals.has(dedupeKey)) {
            return res.status(400).json({ success: false, message: "Duplicate or processing request" });
        }

        // 4. Calculate Net Amount (Amount minus Fee)
        const netAmount = (withdrawAmount - WITHDRAW_FEE).toFixed(4);

        if (netAmount <= 0) {
            return res.status(400).json({ success: false, message: "Amount too low to cover fees" });
        }

        const transferId = crypto.randomUUID();

        // 5. Store the record
        withdrawals.set(transferId, {
            user_id,
            wallet,
            requestedAmount: withdrawAmount,
            fee: WITHDRAW_FEE,
            netAmount: parseFloat(netAmount),
            status: "pending",
            created: new Date()
        });

        /*
        =====================================
        TON PAYMENT INTEGRATION (tonweb or @ton/ton)
        =====================================
        Example logic (Pseudo-code):
        const result = await tonWallet.sendTransfer({
            to: wallet,
            amount: toNano(netAmount), // Send the amount MINUS fee
            ...
        });
        */

        res.json({
            success: true,
            message: "Withdrawal queued",
            transferId,
            details: {
                sent_to_wallet: wallet,
                fee_deducted: WITHDRAW_FEE,
                user_will_receive: parseFloat(netAmount)
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/withdraw/:id", (req, res) => {
    const data = withdrawals.get(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
