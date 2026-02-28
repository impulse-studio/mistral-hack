import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { webhook } from "./telegram/webhook";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
	path: "/telegram",
	method: "POST",
	handler: webhook,
});

export default http;
