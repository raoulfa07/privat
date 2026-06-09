import { handleHomeRequest } from "../../lib/vercel-home.mjs";

export default {
  fetch: handleHomeRequest,
};
