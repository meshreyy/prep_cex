//a Map that stores pending resolvers

const pendingRequest = new Map<string, {resolve : (value : unknown) => void, reject : (reason?: unknown) => void}>();


export default pendingRequest;