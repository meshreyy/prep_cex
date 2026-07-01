import { dispatchCommand } from "../dispatch";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export function startHttpServer(port: number): void {
    Bun.serve({
        port,
        async fetch(req) {
            if (req.method === "OPTIONS") {
                return new Response(null, { status: 204, headers: corsHeaders });
            }

            const url = new URL(req.url);

            if (req.method === "GET" && url.pathname === "/health") {
                return Response.json({ ok: true }, { headers: corsHeaders });
            }

            if (req.method === "POST" && url.pathname === "/command") {
                try {
                    const body = (await req.json()) as {
                        type?: string;
                        payload?: Record<string, unknown>;
                    };

                    if (!body.type) {
                        return Response.json(
                            { error: "type required" },
                            { status: 400, headers: corsHeaders },
                        );
                    }

                    const result = await dispatchCommand(
                        body.type,
                        body.payload ?? {},
                    );
                    return Response.json(result, { headers: corsHeaders });
                } catch (err) {
                    console.error("[engine http] command error:", err);
                    return Response.json(
                        {
                            error:
                                err instanceof Error
                                    ? err.message
                                    : "Command failed",
                        },
                        { status: 500, headers: corsHeaders },
                    );
                }
            }

            return new Response("Not found", { status: 404, headers: corsHeaders });
        },
    });

    console.log(`[engine] HTTP transport on http://localhost:${port}`);
}
