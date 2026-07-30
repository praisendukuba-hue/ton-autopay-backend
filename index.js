const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("MAIN OK");
});

app.get("/wallet-check", (req, res) => {
    res.json({
        success: true,
        message: "WALLET ROUTE OK"
    });
});

app.listen(PORT, () => {
    console.log("Running on port " + PORT);
});
