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

export const chatsWithChatGPT = async (ws: any, message: any) => {

    try {
        let chatsTemp = []
        let tenantTemp: Tenant[] = []
        let userTenantData: any

        let totalPrompt = 0
        let totalCompletion = 0

        const getTenants = await clientRedis.get(REDIS_TENANT) ?? "-"
        const getToken: any = await clientRedis.get(`USER_TOKEN_${message.token}`) ?? "-"

        const tenantData = JSON.parse(getTenants).find((val: any) => val.id == message.tenant)
        const tenantKey = tenantKeyData.find((val: any) => val.tenantName == message.tenant)

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
        // const usageInfo = new GPTTokens({
        //     model: "gpt-4o-mini",
        //     messages: [
        //         ...getMessageInput.map((val: any) => {
        //             return {
        //                 role: val.role,
        //                 content: val.content
        //             }
        //         })
        //     ],
        // })

        // console.log('Used tokens: ', usageInfo.usedTokens)

        // if (usageInfo.usedTokens > tenantData.maxContext) {
        //     // TODO HERE
        // }

        //Send message to OpenAI

        let messagesOpenAi = [
            {
                role: 'system',
                content: `you are an assistant that embeds in chat app. Your job to help any user request.
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
            apiKey: tenantKey?.chatGptKey
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

        //============= Postgree ===================
        await prisma.tenant.update({
            where: {
                id: message.tenant
            },
            data: {
                totalPromptTokenUsage: tenantData.totalPromptTokenUsage + totalPrompt,
                totalCompletionTokenUsage: tenantData.totalCompletionTokenUsage + totalCompletion
            }
        })
        
    } catch (error: any) {
        ws.send(JSON.stringify({ status: error.status, message: error }));
        console.log("WS error =>", error)
        ws.close();

    }
}
