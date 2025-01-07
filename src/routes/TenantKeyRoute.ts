import Elysia, { Context, t } from "elysia";
import { checkValidToken } from "../services/AuthService";
import { failedResponse } from "../helpers/response_json";
import { checkIp } from "../controllers/AuthController";
import { editTenantKey, getTenantKeys } from "../controllers/TenantKeyController";
import { file } from "bun";
import fs from 'fs'

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
    .get(`/file`, async()=>{
        const filePath = `./resources/list_api.txt`;
        try {
            console.log("test")
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) {
              throw new Error('File not found');
            }
          
             fs.createReadStream(filePath); 
          } catch (error) {
            console.error('Error downloading file:', error);
            return { message: 'File not found' };
          }
    });

export const TenantKeyRoutes = Routes;