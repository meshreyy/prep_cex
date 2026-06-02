
import type{ Request, Response } from "express";
import { sendToEngine } from "../utils/engine_client";



export const order = async(req : Request, res : Response) => {

    const {userId, market, side, quantity, price} = req.body;
    const result = await sendToEngine("CREATE_ORDER", {userId, market, side, quantity, price});

    //send back to the frontend

res.status(200).json(result);
}

export const onramp = async(req: Request, res: Response) => {

    const{userId, amount} = req.body;
    const result = await sendToEngine("USER_BALANCE", {userId, amount});

    res.status(200).json(result);
}

