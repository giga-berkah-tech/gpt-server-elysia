import axios from "axios"
import { clientRedis } from ".."
import { DateInDb } from "../types/date_in_db"
import { Tenant, UserTenant } from "../types/tenant"
import { API_URL, CHAT_GPT_MODEL } from "../utils/constants"
import { REDIS_DATE_IN_DB, REDIS_TENANT } from "../utils/key_types"
import { GPTTokens } from "gpt-tokens"
import OpenAI from "openai"
import { tenantKeyData } from "../services/LoadDataService"
import prisma from "../helpers/prisma_client"
import { chatsWithChatGPT } from "./OpenAiWithChatGptController"
import { failedResponse, successDataResponse } from "../helpers/response_json"
import { chatsWithOpenRouter } from "./OpenAiWithOpenRouterController"

const checkOneMonthResetTokenComsumption = async (ws: any, userId: string) => {
    let dateInDb: DateInDb
    let userTenant: UserTenant

    try {
        const getUserTenant = await clientRedis.get(`USER_DATA_${userId}`) ?? null
        const getDateInDb = await clientRedis.get(`date_in_db`) ?? null
        if (getUserTenant != null && getDateInDb != null) {
            dateInDb = JSON.parse(getDateInDb)
            userTenant = JSON.parse(getUserTenant)
            let dateNow = new Date()

            if (dateInDb.month != dateNow.getMonth() + 1) {
                await clientRedis.set(
                    `USER_DATA_${userId}`,
                    JSON.stringify({
                        "userId": userTenant.userId,
                        "totalCompletionTokenUsage": 0,
                        "totalPromptTokenUsage": 0,
                        "tenant": userTenant.tenant,
                        "token": userTenant.token
                    }),
                );
            }

            //============= Redis ===================

            await clientRedis.set(
                REDIS_DATE_IN_DB,
                JSON.stringify([
                    {
                        "second": dateNow.getSeconds(),
                        "minutes": dateNow.getMinutes(),
                        "hours": dateNow.getHours(),
                        "day": dateNow.getDay(),
                        "month": dateNow.getMonth() + 1,
                        "year": dateNow.getFullYear()
                    }
                ]),
            );

            //============= Postgress ===================

            await prisma.dateInDb.updateMany({
                data: {
                    second: dateNow.getSeconds(),
                    minutes: dateNow.getMinutes(),
                    hours: dateNow.getHours(),
                    day: dateNow.getDay(),
                    month: dateNow.getMonth() + 1,
                    year: dateNow.getFullYear()
                }
            })
        }
    } catch (error) {
        console.log(error)
        ws.send(JSON.stringify({ status: 500, message: "Server Error [checkOneMonthResetTokenComsumption]" }));
        ws.close();
        return null
    }
}

const verifyWebSocketUser = async (ws: any, tenant: string, token: string) => {
    try {
        const response = await axios.get(`${API_URL}/member/memberInfo/getMemberByToken`, {
            headers: {
                'Authorization': token
            }
        });
        const getUserTenant = await clientRedis.get(`USER_DATA_${response.data.data.id}`) ?? "-"


        if (getUserTenant != "-") {

            let dataUser = {
                userId: response.data.data.id,
                totalCompletionTokenUsage: JSON.parse(getUserTenant).totalCompletionTokenUsage,
                totalPromptTokenUsage: JSON.parse(getUserTenant).totalPromptTokenUsage,
                tenant: tenant,
                token: token
            }
            await clientRedis.set("USER_DATA_" + dataUser.userId, JSON.stringify(dataUser), {
                EX: 60 * 60 * 1
            })
        } else {
            let dataUser = {
                userId: response.data.data.id,
                totalCompletionTokenUsage: 0,
                totalPromptTokenUsage: 0,
                tenant: tenant,
                token: token
            }
            await clientRedis.set("USER_DATA_" + dataUser.userId, JSON.stringify(dataUser), {
                EX: 60 * 60 * 1
            })
        }

        let dataToken = {
            authStatus: true,
            userId: response.data.data.id
        }

        await clientRedis.set("USER_TOKEN_" + token, JSON.stringify(dataToken), {
            EX: 60 * 60 * 1
        })

        checkOneMonthResetTokenComsumption(ws, response.data.data.id)

        return "true"

    } catch (error) {
        // clientRedis.set("USER_TOKEN_" + token, "false")
        let dataToken = {
            authStatus: false,
            userId: ""
        }
        await clientRedis.set("USER_TOKEN_" + token, JSON.stringify(dataToken), {
            EX: 60 * 60 * 1
        })
        return "false"
    }
}

export const checkTenantVerifyUser = async (ws: any, message: any) => {

    let tenantTemp: Tenant[] = []

    const getTenants = await clientRedis.get(REDIS_TENANT) ?? null

    if (getTenants != null) {
        JSON.parse(getTenants).map((val: any) => {
            tenantTemp.push({
                ...val
            })
        })

        if (JSON.parse(getTenants).find((val: any) => val.id == message.tenant) == null) {
            ws.send(JSON.stringify({ status: 404, message: "Tenant not found, please create a new tenant" }));
            return false
        }

    } else {
        ws.send(JSON.stringify({ status: 404, message: "Tenant key not found in redis" }));
    }

    return await verifyWebSocketUser(ws, message.tenant, message.token) === "true"
}

export const runningModelOpenAi = async (ws: any, message: any) => {

    const getTenantRedis: any = await clientRedis.get(REDIS_TENANT) ?? null

    if (JSON.parse(getTenantRedis).find((val: any) => val.id == message.tenant) != null) {
        const tenant: Tenant = JSON.parse(getTenantRedis).find((val: any) => val.id == message.tenant)
        if (tenant.modelOpenAiId != null) {
            if (tenant.modelOpenAiId === 1) {
                chatsWithChatGPT(ws, message)

            } else {
                chatsWithOpenRouter(ws, message)
            }
        } else {
            ws.send(JSON.stringify({ status: 404, message: "Model in this tenant not found, please set model in this tenant" }));
        }
    } else {
        ws.send(JSON.stringify({ status: 404, message: "Tenant not found" }));
    }


}