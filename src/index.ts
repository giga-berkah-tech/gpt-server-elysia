import { Elysia, t, TSchema } from "elysia";
import { AuthRoutes, DateInDbRoutes, TenantKeyRoutes, TenantRoutes } from "./routes";
import { AUTH_PREFIX, DATE_IN_DB_PREFIX, MODEL_OPENAI_PREFIX, TENANT_KEY_PREFIX, TENANT_PREFIX } from "./utils/key_types";
import { ip } from "elysia-ip";
import { createClient } from "redis";
import { REDIS_URL } from "./utils/constants";
import { checkConnRedis } from "./services/AuthService";
import { chatsWithChatGPT } from "./controllers/OpenAiWithChatGptController";
import fs from 'fs'
import { chatsWithOpenRouter } from "./controllers/OpenAiWithOpenRouterController";
import { checkTenantVerifyUser, runningModelOpenAi } from "./controllers/UtilsForOpenAiController";
import { ModelOpenAiRoutes } from "./routes/ModelOpenAiRoute";


export const clientRedis = createClient({
  url: REDIS_URL,
  password: "",
})

const app = new Elysia()

//Home page
app.get('/', () => 'Hello from chatgpt service! v0.0.32')
// app.get('/', () => 'Hello from chatgpt service DEV! v0.0.2')

//Api Routes
const prefix = "/api"
app.use(ip())
app.group(`${prefix}/${AUTH_PREFIX}`, (app) => app.use(AuthRoutes))
app.group(`${prefix}/${TENANT_PREFIX}`, (app) => app.use(TenantRoutes))
app.group(`${prefix}/${DATE_IN_DB_PREFIX}`, (app) => app.use(DateInDbRoutes))
app.group(`${prefix}/${TENANT_KEY_PREFIX}`, (app) => app.use(TenantKeyRoutes))
app.group(`${prefix}/${MODEL_OPENAI_PREFIX}`, (app) => app.use(ModelOpenAiRoutes))

app.get('/download', async ({ params, set }) => {
  const file = await fs.promises.readFile('./resources/list_api.txt', 'utf-8'); 
    return new Response(file, {
      headers: {
        'Content-Type': 'text/plain', // Adjust based on your file type
        'Content-Disposition': 'attachment; filename="list_api.txt"', 
      },
    });
})


//Web Socket
app.ws('/ws', {
  // body: t.Object({
  //   tenant: t.String(),
  //   token: t.String(),
  //   messages: t.Any(),
  //   uuid: t.String(),
  // }),
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

        if (!await checkTenantVerifyUser(ws, message)) {
          console.log("WS error =>", message)
          ws.send(JSON.stringify({ status: 401, message: "user not valid" }))
          ws.close();
          return;
        };
        runningModelOpenAi(ws, message)
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
