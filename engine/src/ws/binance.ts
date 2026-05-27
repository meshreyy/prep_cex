import WebSocket from "ws";
import { MARK_PRICE } from "../store/perp-store";

export default function startBinanceWs() {
    const ws = new WebSocket("wss://stream.binance.com:9443/ws/solusdt@trade");

    ws.on("message", (data) => {
    const trade = JSON.parse(data.toString());
    const price = parseFloat(trade.p);
    MARK_PRICE.set("SOL",price);
})
}

