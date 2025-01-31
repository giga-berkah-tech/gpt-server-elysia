import OpenAI from "openai";
import { Tenant } from "../types/tenant";
import { clientRedis } from "..";
import { REDIS_TENANT } from "../utils/key_types";
import { tenantKeyData } from "../services/LoadDataService";
import prisma from "../helpers/prisma_client";

export const chatsOpenRouter = async (ws: any, message: any) => {

    try {
        let chatsTemp = [];

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
    
        const getMessageInput: [] = message.messages;
    
        let messagesOpenAi = [
            {
                role: 'system',
                content: `
                    Respond with complete words and phrases, avoiding unnecessary splitting of words. Ensure the response is structured properly, without fragmenting words unnaturally.
                `
            },
            ...getMessageInput.map((val: any) => {
                return {
                    role: val.role,
                    content: val.content
                };
            })
        ];
    
        const openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: "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",
        });
    
        const completionOpenAi = await openai.chat.completions.create({
            model: "deepseek/deepseek-chat",
            stream: true,
            stream_options: {
                include_usage: true
            },
            messages: messagesOpenAi
        });
    
        let buffer = ''; // Buffer to accumulate response chunks
        let wordBuffer: string[] = []; // Buffer to accumulate complete words
        let sendId = 0;
    
        for await (const chunk of completionOpenAi) {
            if (chunk.choices.length !== 0) {
                const content = chunk.choices[0].delta.content || '';
                buffer += content; // Append the new content to the buffer
    
                // Split the buffer into words
                const words = buffer.split(' ');
                if (words.length > 1) {
                    // Add all complete words to the wordBuffer
                    wordBuffer.push(...words.slice(0, -1));
    
                    // Keep the last (possibly incomplete) word in the buffer
                    buffer = words[words.length - 1];
                }
    
                // Send chunks only if there are at least 5 words
                if (wordBuffer.length >= 5) {
                    const chunkToSend = wordBuffer.splice(0, 5); // Take the first 5 words
                    sendId += 1;
                    const data = {
                        status: 200,
                        uuid: message.uuid,
                        id: sendId,
                        maxContext: tenantData.maxContext,
                        msg: chunkToSend // Send the chunk of 5 words
                    };
                    ws.send(JSON.stringify(data));
                }
            }
    
            totalPrompt += chunk.usage?.prompt_tokens ?? 0;
            totalCompletion += chunk.usage?.completion_tokens ?? 0;
        }
    
        // Send any remaining words in the wordBuffer (if any)
        if (wordBuffer.length > 0) {
            sendId += 1;
            const data = {
                status: 200,
                uuid: message.uuid,
                id: sendId,
                maxContext: tenantData.maxContext,
                msg: wordBuffer // Send the remaining words as a single batch
            };
            ws.send(JSON.stringify(data));
        }
    
        // Send any remaining content in the buffer (incomplete word)
        if (buffer) {
            sendId += 1;
            const data = {
                status: 200,
                uuid: message.uuid,
                id: sendId,
                maxContext: tenantData.maxContext,
                msg: [buffer] // Send the remaining content
            };
            ws.send(JSON.stringify(data));
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

    } catch (error:any) {
        ws.send(JSON.stringify({ status: error.status, message: error }));
        console.log("WS error =>", error)
        ws.close();
    }
   
};