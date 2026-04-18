import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/** MSW service worker for browser/dev environment. */
export const worker = setupWorker(...handlers);
