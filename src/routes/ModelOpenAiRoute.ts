import Elysia, { Context, t } from "elysia";
import { checkValidToken } from "../services/AuthService";
import { failedResponse } from "../helpers/response_json";
import { checkIp } from "../controllers/AuthController";
import { editTenantKey, getTenantKeys } from "../controllers/TenantKeyController";
import { file } from "bun";
import fs from 'fs'
import { getModelOpenAi } from "../controllers/ModelOpenAiController";

const Routes = new Elysia()
    .get(`/`, async (context: Context) => {
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return getModelOpenAi()
    }).onError(({ code, error }: any)=>{
        var message = JSON.parse(error.message)
        return failedResponse(message.errors.map((val: any) => val.summary).join(', '),200) 
    });

export const ModelOpenAiRoutes = Routes;