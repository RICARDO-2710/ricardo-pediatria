import handler from "./stripe-webhook";

export const config = { api: { bodyParser: false } };
export default handler;