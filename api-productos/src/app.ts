import dotenv from "dotenv";
import { Server } from "./server.ts";
import routes from "./routes/index.ts";

dotenv.config();
const port = Number(process.env["PORT"] ?? 3000);

new Server({ port, routes }).start();