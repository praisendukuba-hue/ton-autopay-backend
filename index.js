require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const { mnemonicToPrivateKey } = require("@ton/crypto");
const { TonClient, WalletContractV4 } = require("@ton/ton");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY;
const TON_API_KEY = process.env.TON_API_KEY;
const TON_MNEMONIC = process.env.TON_MNEMONIC;


// TON connection
const client = new TonClient({
    endpoint: "https://toncenter.com/api/v2/jsonRPC",
    apiKey: TON_API_KEY
});


// Temporary storage
const withdrawals = new Map();


// Home
app.get("/", (req,res)=>{
    res.json({
        status:"online",
        message:"TON AutoPay Backend Running"
    });
});

app.get("/wallet-check", async(req,res)=>{
    try{
        const words = TON_MNEMONIC.split(" ");

        const keyPair = await mnemonicToPrivateKey(words);

        const wallet = WalletContractV4.create({
            workchain:0,
            publicKey:keyPair.publicKey
        });

        const balance = await client.getBalance(wallet.address);

        res.json({
            success:true,
            address:wallet.address.toString(),
            balance:balance.toString()
        });

    }catch(e){
        res.status(500).json({
            success:false,
            error:e.message
        });
    }
});

// Withdrawal request
app.post("/withdraw",(req,res)=>{

    const auth = req.headers["x-api-key"];

    if(auth !== API_KEY){
        return res.status(401).json({
            success:false,
            message:"Invalid API key"
        });
    }


    const {
        user_id,
        wallet,
        amount
    } = req.body;


    if(!user_id || !wallet || !amount){

        return res.status(400).json({
            success:false,
            message:"Missing data"
        });

    }


    const id = crypto.randomUUID();


    withdrawals.set(id,{
        user_id,
        wallet,
        amount,
        status:"pending",
        created:new Date()
    });


    res.json({
        success:true,
        withdrawal_id:id,
        message:"Withdrawal queued"
    });


});


// Status check
app.get("/withdraw/:id",(req,res)=>{

    const data = withdrawals.get(req.params.id);

    if(!data){
        return res.status(404).json({
            success:false,
            message:"Not found"
        });
    }

    res.json({
        success:true,
        data
    });

});


app.listen(PORT,()=>{
    console.log(`Server running on ${PORT}`);
});
