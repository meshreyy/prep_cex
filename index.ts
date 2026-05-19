import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { User, Order, Position, Fill } from "../types";

//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsImlhdCI6MTc3ODk5NTg0OX0.8uFIrPbjfofUckMtVaMt8dyMtEhPIVY6fNYY2pSAUE4


const app = express();
app.use(express.json());

const users = [{
    userId: 1,
    username: "harkirat",
    password: "123123",
    collateral: {
        available: 2000,
        locked: 1000
    },
    positions: [
        { market: "SOL", type: "LONG", qty: 10, margin: 500, liquidationPrice: 80, averagePrice: 90 },
        { market: "ETH", type: "SHORT", qty: 1, margin: 500, liquidationPrice: 2000, averagePrice: 1900 }
    ],
    orders: [
        { orderId: 1, market: "SOL", type: "LONG", qty: 10, margin: 500, orderType: "limit", price: 90, status: "filled" },
        { orderId: 2, market: "ETH", type: "SHORT", qty: 10, margin: 500, orderType: "limit", price: 1900, status: "filled" },
        { orderId: 3, market: "BTC", type: "LONG", qty: 10, margin: 500, orderType: "limit", price: 1900, status: "cancelled" },
    ]
}, {
    userId: 2,
    username: "raman",
    password: "123123",
    collateral: {
        available: 2000,
        locked: 2000
    },
    positions: [
        { market: "SOL", type: "SHORT", qty: 10, margin: 1000, liquidationPrice: 80, pnL: 200, averagePrice: 90 },
        { market: "ETH", type: "LONG", qty: 1, margin: 1000, liquidationPrice: 2000, pnL: -100, averagePrice: 1900 }
    ],
    orders: [
        { orderId: 10, market: "SOL", type: "SHORT", qty: 10, margin: 500, orderType: "market", price: 90, status: "filled" },
        { orderId: 11, market: "ETH", type: "LONG", qty: 10, margin: 500, orderType: "market", price: 1900, status: "filled" },
        { orderId: 12, market: "ZEC", type: "LONG", qty: 10, margin: 500, orderType: "limit", price: 1900, status: "open" },
    ]
}];

type Bid = {
    availableQty: number,
    openOrders: { userId: number, qty: number, filledQty: number, orderId: number, createdAt: Date }[]
}

type Orderbook = {
    bids: Record<string, Bid>,
    asks: Record<string, Bid>,
    lastTradedPrice: number,
    indexPrice: number
}

type Orderbooks = Record<string, Orderbook>

const orderbooks: Orderbooks = {
    SOL: { bids: {}, asks: {}, lastTradedPrice: 90, indexPrice: 90.01 },
    ETH: { bids: {}, asks: {}, lastTradedPrice: 1900, indexPrice: 1899.9 }
}

const fills = [{
    maker: 1,
    taker: 2,
    market: "SOL",
    qty: 10,
    price: 90,
    long: 1,
    short: 2
}, {
    maker: 1,
    taker: 2,
    market: "ETH",
    qty: 1,
    price: 1900,
    long: 2,
    short: 1
}];

//1
app.post("/signup", async (req, res) => {
    const { username, password } = req.body
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
        res.status(409).json("username already exists");
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    users.push({
        userId: users.length + 1,
        username: username,
        password: hashedPassword,
        collateral: { available: 0, locked: 0 },
        positions: [],
        orders: []
    });
    res.status(201).json("User created successfully");

});


//2
app.post("/signin", async (req, res) => {
    //extract username and pass from req.body
    const { username, password } = req.body;
    // find user in the user array
    const existingUser = users.find(u => u.username === username);
    if (!existingUser) {
        res.status(404).json("user not found");
        return;
    }
    else {
        //we'll compare the hashedPassword
        const isValid = await bcrypt.compare(password, existingUser.password);
        if (!isValid) {
            res.status(401).json("invalid password");
            return;
        }
        else {
            const token = jwt.sign({ userId: existingUser.userId }, process.env.JWT_SECRET!);
            res.json({ token });
        }


    }

})


//3
app.post("/onramp", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    const { amount } = req.body;

    //verify token to get userId
    if (!token) {
        res.status(401).json("no token provided");
        return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };

    //find user in users array using that userId
    const existingUser = users.find(u => u.userId === decoded.userId);

    if (!existingUser) {
        res.status(404).json("User does not exist");
        return;
    }

    //adding amount to available collateral
    existingUser.collateral.available += amount;
    res.status(200).json({ message: "Funds are deposited successfully", balance: existingUser.collateral });
})



app.post("/order", (req, res) => {

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        res.status(409).json("token not found");
        return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };

    const existingUser = users.find(u => u.userId === decoded.userId);
    if (!existingUser) {
        res.status(409).json("User not found");
        return;
    }

    const { market, type, qty, margin, orderType, price } = req.body;

    if (existingUser.collateral.available >= margin) {
        existingUser.collateral.available -= margin;
        existingUser.collateral.locked += margin;
    }
    else {
        res.status(409).json("Collateral not available");
        return;
    }

    //generate orderId and status
    const newOrder = {
        orderId: existingUser.orders.length + 1,
        status: "open" as Order["status"],
        market: market,
        type: type,
        qty: qty,
        margin: margin,
        orderType: orderType,
        price: price
    }

    existingUser.orders.push(newOrder);



    //getting the right order book
    const orderbook = orderbooks[market];
    if (!orderbook) {
        res.status(409).json("The market is unavailable");
        return;
    }

    //le3ook at the correct side of the orderbook
    const oppositeSide = type === "LONG" ? orderbook.asks : orderbook.bids;
    //while loop
    const prices = Object.keys(oppositeSide);


    //matching logic
    let remainingQty = qty;
    let i = 0;
    let filledQty = 0;
    //it helps with checking : how much was actually filled
    //filledQty>0 && remainingQty>0 -> partially_filled
    //filledQty===0 -> open

    while (remainingQty > 0 && i < prices.length) {
        const level = oppositeSide[prices[i]!];
        if (!level) { i++; continue; }
        let availableQty = level.availableQty;
        if (availableQty < remainingQty) {
            remainingQty = remainingQty - availableQty;
            filledQty += level.availableQty;
            level.availableQty = 0;
            //remove this level from the orderbook
            delete oppositeSide[prices[i]!];
            i++;

        }
        else if (availableQty >= remainingQty) {
            level.availableQty -= remainingQty;
            filledQty += remainingQty;
            remainingQty = 0;
        }

    }
    //updating the order status 

    if (remainingQty === 0) {
        newOrder.status = "filled";
    }
    else if (filledQty > 0) {
        newOrder.status = "partially_filled";
    }
    else {
        newOrder.status = "open"
    }

    res.status(200).json({ order: newOrder })


    //add unmatched order to the orderbook
    const ownSide = type === "LONG" ? orderbook.bids : orderbook.asks;

    //check if a level already exists at that price on that same side
    if (remainingQty > 0) {
        if (ownSide[price]) {
            //level exists, add to it
            ownSide[price].availableQty += remainingQty;
            ownSide[price].openOrders.push({
                userId : decoded.userId,
                qty : qty,
                filledQty : filledQty,
                orderId : newOrder.orderId,
                createdAt : new Date()
            })
        }
        else {
            //create a new level
            //look at bid interface to check the field in which it should be added
            ownSide[price] = {
                availableQty: remainingQty,
                openOrders: [{
                    userId: decoded.userId,
                    qty: qty,
                    filledQty: filledQty,
                    orderId: newOrder.orderId,
                    createdAt: new Date()
                }]
            }
        }
    }
})






app.delete("/order", (req, res) => {

})
app.get("/equity/available", (req, res) => {

})
app.get("/positions/open/:marketId", (req, res) => {

});
app.get("/positions/closed/:marketId", (req, res) => {

});
app.get("/orders/open/:marketId", (req, res) => {

})
app.get("/orders/:marketId", (req, res) => {

})
app.get("/fills", (req, res) => {

});

async function liqudationChecks(asset: string, price: number) {

}


async function onPriceUpdateFromBinance(asset: string, price: number) {
    liqudationChecks(asset, price);
}


app.listen(3000, () => {
    console.log("server running on port 3000");
});

