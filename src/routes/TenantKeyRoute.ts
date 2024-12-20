import Elysia, { Context, t } from "elysia";
import { checkValidToken } from "../services/AuthService";
import { failedResponse } from "../helpers/response_json";
import { checkIp } from "../controllers/AuthController";
import { editTenantKey, getTenantKeys } from "../controllers/TenantKeyController";

const Routes = new Elysia()
    .get(`/`, async (context: Context) => {
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return getTenantKeys()
    })
    .put(`/`, async (context: Context) => {
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return editTenantKey(context.body)
    }, {
        body: t.Object({
            tenant_name: t.String(),
            chat_gpt_key: t.String(),
        }),
    })

export const TenantKeyRoutes = Routes;