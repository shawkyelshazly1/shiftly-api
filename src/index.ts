import { createApp } from "./app";

const app = createApp();

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
};
