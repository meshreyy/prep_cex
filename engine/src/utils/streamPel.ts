/** Minimal Redis surface for PEL cleanup (avoids RedisClientType generic mismatch). */
export type StreamPelClient = {
    xPendingRange(
        key: string,
        group: string,
        start: string,
        end: string,
        count: number,
        options?: { consumer?: string },
    ): Promise<Array<{ id: string }>>;
    xAck(key: string, group: string, id: string | string[]): Promise<number>;
    xGroupDelConsumer(
        
        
        key: string,
        group: string,
        consumer: string,
    ): Promise<number>;
};

export function isPelLimitError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return (
        msg.includes("PEL") ||
        msg.includes("XReadGroup is cancelled") ||
        msg.includes("Pending Entries List")
    );
}

export async function clearConsumerPel(
    
    client: StreamPelClient,
    streamKey: string,
    group: string,
    consumer: string,
    label: string,
): Promise<number> {
    let total = 0;

    for (let i = 0; i < 500; i++) {
        const range = await client.xPendingRange(
            streamKey,
            group,
            "-",
            "+",
            50,
            { consumer },
        );

        if (!range.length) break;

        const ids = range.map((entry) => entry.id);
        await client.xAck(streamKey, group, ids);
        total += ids.length;
    }

    if (total > 0) {
        console.log(
            `[${label}] Cleared ${total} pending entries on ${streamKey} (consumer ${consumer})`,
        );
    }

    return total;
}

export async function recoverConsumerPel(
    client: StreamPelClient,
    streamKey: string,
    group: string,
    consumer: string,
    label: string,
): Promise<void> {
    try {
        await clearConsumerPel(client, streamKey, group, consumer, label);
    } catch (error) {
        if (!isPelLimitError(error)) {
            console.error(`[${label}] PEL cleanup error:`, error);
            return;
        }

        console.warn(
            `[${label}] PEL still blocked — removing consumer ${consumer} from group ${group}`,
        ); 
        try {
            await client.xGroupDelConsumer(streamKey, group, consumer);
            console.log(
                `[${label}] Consumer ${consumer} deleted; PEL reset for next start`,
            );
        } catch (delErr) {
            console.error(`[${label}] xGroupDelConsumer failed:`, delErr);
        }
    }
}
