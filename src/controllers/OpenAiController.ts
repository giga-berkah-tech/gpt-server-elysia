import axios from "axios"
import { clientRedis } from ".."
import { DateInDb } from "../types/date_in_db"
import { Tenant, UserTenant } from "../types/tenant"
import { API_URL, CHAT_GPT_MODEL } from "../utils/constants"
import { REDIS_DATE_IN_DB, REDIS_TENANT, REDIS_TENANT_KEYS } from "../utils/key_types"
import { GPTTokens } from "gpt-tokens"
import OpenAI from "openai"

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

            await clientRedis.set(
                REDIS_DATE_IN_DB,
                JSON.stringify({
                    "second": dateNow.getSeconds(),
                    "minutes": dateNow.getMinutes(),
                    "hours": dateNow.getHours(),
                    "day": dateNow.getDay(),
                    "month": dateNow.getMonth() + 1,
                    "year": dateNow.getFullYear()
                }),
            );

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

export const chatsOpenAi = async (ws: any, message: any) => {

    try {
        let chatsTemp = []
        let tenantTemp: Tenant[] = []
        let userTenantData: any

        let totalPrompt = 0
        let totalCompletion = 0

        const getTenants = await clientRedis.get(REDIS_TENANT) ?? "-"
        const getTenantKey = await clientRedis.get(REDIS_TENANT_KEYS) ?? "-"
        const getToken: any = await clientRedis.get(`USER_TOKEN_${message.token}`) ?? "-"

        const tenantData = JSON.parse(getTenants).find((val: any) => val.id == message.tenant)
        const tenantKeyData = JSON.parse(getTenantKey).find((val: any) => val.tenantName == message.tenant)

        if (getToken != "-") {
            const tokenData = JSON.parse(getToken)
            const getUserTenant = await clientRedis.get(`USER_DATA_${tokenData.userId}`) ?? "-"
            userTenantData = JSON.parse(getUserTenant)
        } else {
            ws.send(JSON.stringify({ status: 401, message: "sorry, user not valid" }));
        }

        if ((userTenantData.totalPromptTokenUsage + userTenantData.totalCompletionTokenUsage) > tenantData.maxConsumptionToken) {
            ws.send(JSON.stringify({ status: 403, message: "You have exceeded the tenant quota consumption" }));
            ws.close();
        }

        //Get messages from client
        const getMessageInput: [] = message.messages

        //Get length token
        const usageInfo = new GPTTokens({
            model: "gpt-4o-mini",
            messages: [
                ...getMessageInput.map((val: any) => {
                    return {
                        role: val.role,
                        content: val.content
                    }
                })
            ],
        })

        console.log('Used tokens: ', usageInfo.usedTokens)

        if (usageInfo.usedTokens > tenantData.maxContext) {
            // TODO HERE
        }

        //Send message to OpenAI

        let messagesOpenAi = [
            {
                role: 'system',
                content: `
                        if user request image,video please give only link but not giving search URL, just give a random url link but not from example.com !!!
       
                    `
            },
            ...getMessageInput.map((val: any) => {
                return {
                    role: val.role,
                    content: val.content
                }
            })
        ];

        const clientOpenAi = new OpenAI({
            apiKey: tenantKeyData.chatGptKey
        });

        const openAi = await clientOpenAi.chat.completions.create({
            messages: messagesOpenAi,
            model: CHAT_GPT_MODEL!,
            // max_completion_tokens:  Number(JSON.parse(getTenants).find((val: any) => val.id == message.tenant).maxCompletionToken),
            // Number(JSON.parse(getTenants).find((val: any) => val.id == message.tenant).maxInput),
            stream: true,
            stream_options: {
                include_usage: true
            }
        });
        let frameSize = 0;
        let frameTemp = [];
        let sendId = 0;

        for await (const chunk of openAi) {
            if (chunk.choices.length != 0) {
                chatsTemp.push({
                    // role: chunk.choices[0].delta.role,
                    content: chunk.choices[0].delta.content
                })
                frameSize += 1;
                frameTemp.push(chunk.choices[0].delta.content)
                if (frameSize == 10) {
                    sendId += 1;
                    const data = {
                        status: 200,
                        uuid: message.uuid,
                        id: sendId,
                        maxContext: tenantData.maxContext,
                        msg: frameTemp
                    }
                    ws.send(JSON.stringify(data));
                    // console.log("=>",JSON.stringify(data))
                    frameSize = 0;
                    frameTemp = [];
                }
            } else {
                totalPrompt = chunk.usage?.prompt_tokens ?? 0
                totalCompletion = chunk.usage?.completion_tokens ?? 0
            }
        }

        if (frameTemp.length != 0) {
            sendId += 1;
            const data = {
                status: 200,
                uuid: message.uuid,
                id: sendId,
                maxContext: tenantData.maxContext,
                msg: frameTemp
            }
            ws.send(JSON.stringify(data));
            // console.log("=>",JSON.stringify(data))
        }

        if (getTenants != null) {
            JSON.parse(getTenants).map((val: any) => {
                tenantTemp.push({
                    ...val
                })
            })

            if (JSON.parse(getTenants).find((val: any) => val.id == message.tenant) == null) {
                ws.send(JSON.stringify({ status: 404, message: "Tenant not found, please create a new tenant" }));
                console.log("WS error => Tenant not found, please create a new tenant")
                return false
            }

        } else {
            ws.send(JSON.stringify({ status: 404, message: "Tenant key not found in redis" }));
            console.log("WS error => Tenant key not found in redis")
        }

        if (userTenantData) {
            userTenantData.totalPromptTokenUsage += totalPrompt;
            userTenantData.totalCompletionTokenUsage += totalCompletion;
            await clientRedis.set(`USER_DATA_${userTenantData.userId}`, JSON.stringify(userTenantData));
        }

        tenantTemp = tenantTemp.map((val: any) => {
            if (val.id == message.tenant) {
                return {
                    ...val,
                    totalPromptTokenUsage: tenantData.totalPromptTokenUsage + totalPrompt,
                    totalCompletionTokenUsage: tenantData.totalCompletionTokenUsage + totalCompletion
                }
            } else {
                return val
            }
        })


        await clientRedis.set(
            REDIS_TENANT,
            JSON.stringify([...tenantTemp]),
        )
        
    } catch (error: any) {
        ws.send(JSON.stringify({ status: error.status, message: error }));
        console.log("WS error =>", error)
        ws.close();

    }
}
