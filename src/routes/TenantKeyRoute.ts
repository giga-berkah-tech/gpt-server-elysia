import Elysia, { Context } from "elysia";
import { checkValidToken } from "../services/AuthService";
import { failedResponse } from "../helpers/response_json";
import { checkIp } from "../controllers/AuthController";
import { getTenantKeys } from "../controllers/TenantKeyController";

const Routes = new Elysia()
.get(`/`, async (context: Context) => {
        if (!checkValidToken(context)) {
            return failedResponse("Token not valid", 401)
        }
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return getTenantKeys()
    })

export const TenantKeyRoutes = Routes;