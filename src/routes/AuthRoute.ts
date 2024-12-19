import Elysia, { Context, t } from "elysia";
import { addIpAllowed, getListIp, getMyIp, removeIpAllowed } from "../controllers/AuthController";

// const prefix = "/auth"

const Routes = new Elysia()
    .get(`/list`, () => getListIp())
    .get(`/my-ip`, ({ ip }: any) => getMyIp(ip))
    .post(`/add`, ({ body }) => addIpAllowed(body as { ip: string }), {
        body: t.Object({
            ip: t.String(),
        }),
    })
    .delete(`/remove`, ({ body }) => removeIpAllowed(body as { ip: string }), {
        body: t.Object({
            ip: t.String(),
        }),
    })

export const AuthRoutes = Routes;