

type PendingResponse = {
    resolve : (value:any) => void;
    reject : (value:any) => void;
};

export const pendingResponses = new Map<string, PendingResponse>();

