import { Context } from "elysia"
import { failedResponse, successDataResponse, successResponse } from "../helpers/response_json"
import { clientRedis } from ".."
import prisma from "../helpers/prisma_client"
import { fetchIpAllowed, ipAllowedData } from "../services/LoadDataService"

export const getMyIp = async (ip: any) => {
    const getIp = ip.replaceAll('::ffff:', '')
    return successDataResponse({
        "myIp": getIp,
    })
}

export const getListIp = async () => {
    let ipAllowedTemp: any = []

    const getIpAllowed = await clientRedis.get("ip_allowed") ?? null

    if (getIpAllowed != null) {
        JSON.parse(getIpAllowed).map((val: any) => {
            ipAllowedTemp.push({
                ip: val.ip
            })
        })

        return successDataResponse(ipAllowedTemp)
    } else {
        await clientRedis.set("ip_allowed", JSON.stringify(ipAllowedData))
        ipAllowedData.map((val: any) => {
            ipAllowedTemp.push({
                ip: val.ip
            })
        })

        return successDataResponse(ipAllowedTemp)
    }
}

export const addIpAllowed = async (body:{ip:string}) => {

    await clientRedis.set("ip_allowed", JSON.stringify(ipAllowedData))

    let ipAllowedTemp: any = []

    const getIpAllowed = await clientRedis.get("ip_allowed") ?? null

    if (getIpAllowed != null) {
        JSON.parse(getIpAllowed).map((val: any) => {
            ipAllowedTemp.push({
                ip: val.ip
            })
        })

        if (ipAllowedTemp.find((val: any) => val.ip == body.ip) == null) {
            ipAllowedTemp.push({
                ip: body.ip
            })

            await clientRedis.set("ip_allowed", JSON.stringify(ipAllowedTemp))

            await prisma.ipAllowed.create({
                data:{
                    ip: body.ip
                }
            })

            fetchIpAllowed()

            return successResponse('Ip added', 200)
        } else {
            return failedResponse('Ip already exist', 400)
        }
    } else {
        return failedResponse('ip_allowed key not found in redis', 404)
    }
}

export const removeIpAllowed = async (body:{ip:string}) => {

    await clientRedis.set("ip_allowed", JSON.stringify(ipAllowedData))

    let ipAllowedTemp: any = []

    const getIpAllowed = await clientRedis.get("ip_allowed") ?? null

    if (getIpAllowed != null) {
        JSON.parse(getIpAllowed).map((val: any) => {
            ipAllowedTemp.push({
                ip: val.ip
            })
        })

        if (ipAllowedTemp.find((val: any) => val.ip == body.ip) != null) {
            ipAllowedTemp = ipAllowedTemp.filter((val: any) => val.ip != body.ip)

            await clientRedis.set("ip_allowed", JSON.stringify(ipAllowedTemp))

            await prisma.ipAllowed.delete({
                where: {
                    ip: body.ip
                }
            })
            fetchIpAllowed()
            return successResponse('Ip removed', 200)
        } else {
            return failedResponse('Ip not found', 404)
        }
    } else {
        return failedResponse('ip_allowed key not found in redis', 404)
    }
}

export const checkIp = async (c:any) => {
    let ipAllowedTemp: any = []
    
    const getIp = c.ip.replaceAll('::ffff:', '')
    let dateNow = new Date()
    console.log(`User IP (${dateNow}) => ${getIp}`)

    const getIpAllowed = await clientRedis.get("ip_allowed") ?? null

    if (getIpAllowed != null) {
        JSON.parse(getIpAllowed).map((val: any) => {
            ipAllowedTemp.push({
                ip: val.ip
            })
        })

        if (ipAllowedTemp.find((val: any) => val.ip == getIp) != null) {
            return true
        }else{
            return false
        }

    } else {
        console.log("ip_allowed key not found in redis")
        return false
    }
}