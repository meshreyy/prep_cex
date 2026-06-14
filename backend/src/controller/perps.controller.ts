import type { Request, Response } from "express";
import { sendToEngine } from "../utils/engine_client";

function readUserId(req: Request): string | null {
  const fromQuery = req.query.userId;
  const fromBody = req.body?.userId;
  const id =
    (typeof fromQuery === "string" ? fromQuery : null) ??
    (typeof fromBody === "string" ? fromBody : null);
  return id?.trim() || null;
}

export const order = async (req: Request, res: Response) => {
  try {

    console.log("ORDER HIT");

    const { userId, market, side, price, orderType } = req.body;
    const qty = Number(req.body.qty ?? req.body.quantity);

    if (!userId || !market || !side || !Number.isFinite(qty) || !price) {
      res.status(400).json({ error: "Missing required order fields" });
      return;
    }

    const result = await sendToEngine("CREATE_ORDER", {
      userId,
      market,
      side,
      qty,
      price: Number(price),
      orderType: orderType ?? "limit",
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Engine unavailable",
    });
  }
};

export const onramp = async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || amount == null) {
      res.status(400).json({ error: "userId and amount required" });
      return;
    }

    const result = await sendToEngine("USER_BALANCE", {
      userId,
      amount: Number(amount),
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Engine unavailable",
    });
  }
};

export const getBalance = async (req: Request, res: Response) => {
  try {

    console.log("BALANCE HIT")

    const userId = readUserId(req);
    if (!userId) {
      res.status(400).json({ error: "userId required" });
      return;
    }

    const result = await sendToEngine("get_equity", { userId });
    res.status(200).json(result);
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Engine unavailable",
    });
  }
};

export const getPositions = async (req: Request, res: Response) => {
  try {
    const userId = readUserId(req);
    if (!userId) {
      res.status(400).json({ error: "userId required" });
      return;
    }

    const result = await sendToEngine("get_open_positions", { userId });
    res.status(200).json(result);
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Engine unavailable",
    });
  }
};

export const getDepth = async (req: Request, res: Response) => {
  try {
    const market =
      typeof req.query.market === "string" ? req.query.market.trim() : "";
    const levels = Number(req.query.levels) || 20;
    if (!market) {
      res.status(400).json({ error: "market required" });
      return;
    }
    const result = await sendToEngine("get_depth", { market, levels });
    res.status(200).json(result);
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Engine unavailable",
    });
  }
};

export const getTrades = async (req: Request, res: Response) => {
  try {
    const market =
      typeof req.query.market === "string" ? req.query.market.trim() : "";
    const limit = Number(req.query.limit) || 50;
    if (!market) {
      res.status(400).json({ error: "market required" });
      return;
    }
    const result = await sendToEngine("get_trades", { market, limit });
    res.status(200).json(result);
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Engine unavailable",
    });
  }
};

export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const { userId, orderId } = req.body;
    if (!userId || !orderId) {
      res.status(400).json({ error: "userId and orderId required" });
      return;
    }

    const result = await sendToEngine("cancel_position", { userId, orderId });
    res.status(200).json(result);
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Engine unavailable",
    });
  }
};
