import { Elysia, t, TSchema } from "elysia";
import { AuthRoutes, DateInDbRoutes, TenantRoutes } from "./routes";
import { AUTH_PREFIX, DATE_IN_DB_PREFIX, TENANT_PREFIX } from "./utils/key_types";
import { ip } from "elysia-ip";
import { createClient } from "redis";
import { REDIS_URL } from "./utils/constants";
import { Seeding } from "./seed/seed";
import { ElysiaWS } from "elysia/dist/ws";
import { TypeCheck } from "elysia/dist/type-system";
import { ServerWebSocket } from "bun";
import { checkConnRedis } from "./services/AuthService";
import { chatsOpenAi, checkTenantVerifyUser } from "./controllers/OpenAiController";

export const clientRedis = createClient({
  url: REDIS_URL,
  password: "",
})

const app = new Elysia()

//Home page
// app.get('/', () => 'Hello from chatgpt service! v0.0.0')
app.get('/', () => 'Hello from chatgpt service DEV! v0.0.2')

//Api Routes
const prefix = "/api"
app.use(ip())
app.group(`${prefix}/${AUTH_PREFIX}`, (app) => app.use(AuthRoutes))
app.group(`${prefix}/${TENANT_PREFIX}`, (app) => app.use(TenantRoutes))
app.group(`${prefix}/${DATE_IN_DB_PREFIX}`, (app) => app.use(DateInDbRoutes))

//Web Socket
app.ws('/ws', {
  body: t.Object({
    tenant: t.String(),
    token: t.String(),
    messages: t.Any(),
    uuid: t.String(),
  }),
  open: (ws) => {
    console.log("WS => Client connected");
  }, 
  message: async(ws,message:any) => {
    try {
      if (!message || !message.token || !message.tenant || !message.messages  || !message.uuid) {
        ws.send(JSON.stringify({ status: 422, message: "input invalid" }))
        console.log("WS error => input invalid")
        return;
      }

        // if (! await checkTenantVerifyUser(ws, message)) {
        //   console.log("WS error =>", message)
        //   ws.send(JSON.stringify({ status: 401, message: "user not valid" }))
        //   ws.close();
        //   return;
        // };
        chatsOpenAi(ws,message)
    } catch (error) {
      ws.send(JSON.stringify({ status: 500, message: "Connection Error" }))
      ws.close();
      // ws.close();
      return;
    }
  },
  close: (ws) => {
    console.log("WS => Client close/disconnected");
  },
  error: (c) => {
    console.log('error:', JSON.stringify(c));
  },
  idleTimeout: 60
})

app.listen({idleTimeout:20,port:3001})

checkConnRedis()

console.log(
  `✅ Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
