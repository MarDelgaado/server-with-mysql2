import express, { Router } from "express";

interface ServerOptions {
    port: number;
    routes: Router;
}

export class Server {
    private readonly app = express();
    private readonly port: number;
    private readonly routes: Router;

    constructor(options: ServerOptions) {
    this.port = options.port;
    this.routes = options.routes;
    }

    start() {
    this.app.use(express.json());
    this.app.use("/api/v1", this.routes);
    this.app.listen(this.port, () => {
        console.log(`server running on port: ${this.port}`);
    });
    }
}