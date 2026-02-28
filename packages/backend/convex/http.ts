import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { webhook } from "./telegram/webhook";
import { converse } from "./voice/converse";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
	path: "/telegram",
	method: "POST",
	handler: webhook,
});

http.route({
	path: "/voice/converse",
	method: "POST",
	handler: converse,
});

http.route({
	path: "/voice/converse",
	method: "OPTIONS",
	handler: converse,
});

export default http;
