require("dotenv").config();

const express = require("express");
const crypto = require("crypto");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

const MIN_WITHDRAW = 1;


// Temporary storage
// Later we replace this with MongoDB/Firebase
const withdrawals = new Map();


// Home test
app.get("/", (req, res) => {
    res.json({
        status: "online",
        message: "TON AutoPay Backend Running"
    });
});


// Withdraw endpoint
app.post("/withdraw", async (req, res) => {

    try {

        // API security
        const key = req.headers["x-api-key"];

        if (key !== API_KEY) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }


        const {
            user_id,
            wallet,
            amount
        } = req.body;


        if (!user_id || !wallet || !amount) {
            return res.status(400).json({
                success:false,
                message:"Missing user_id, wallet or amount"
            });
        }


        if (Number(amount) < MIN_WITHDRAW) {
            return res.status(400).json({
                success:false,
                message:`Minimum withdrawal is ${MIN_WITHDRAW}`
            });
        }


        // Create transaction ID
        const transferId = crypto.randomUUID();


        // Prevent duplicate requests
        if (withdrawals.has(transferId)) {

            return res.json({
                success:false,
                message:"Duplicate request"
            });

        }


        withdrawals.set(transferId, {
            user_id,
            wallet,
            amount,
            status:"pending",
            created:new Date()
        });



        /*
        =====================================
        TON PAYMENT GOES HERE
        =====================================

        Steps:
        1. Load payout wallet
        2. Create TON transaction
        3. Sign transaction
        4. Broadcast to TON network
        5. Save transaction hash

        */


        // Temporary success response
        res.json({
            success:true,
            message:"Withdrawal queued",
            transferId,
            data:{
                user_id,
                wallet,
                amount,
                status:"pending"
            }
        });


    } catch(error){

        console.log(error);

        res.status(500).json({
            success:false,
            message:"Server error"
        });

    }

});



// Check withdrawal status
app.get("/withdraw/:id", (req,res)=>{

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



app.listen(PORT, ()=>{

    console.log(`Server running on port ${PORT}`);

});
