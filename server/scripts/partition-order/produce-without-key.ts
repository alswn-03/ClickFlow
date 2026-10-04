// produce-without-key.ts
import { sendOrderedEvents } from "./send-ordered-events.js";
const count = Number(process.argv[2] ?? 5);
await sendOrderedEvents({
  userId: "order-test-without-key",
  useKey: false,
  count,
});
