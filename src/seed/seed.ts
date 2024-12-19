import { clientRedis } from ".."
import prisma from "../helpers/prisma_client"
import { CHAT_GPT_API_KEY } from "../utils/constants"

const tenantData = [
    {
        id: "100",
        name: "100",
        maxContext: 2048,
        maxConsumptionToken: 1000000,
        totalPromptTokenUsage: 0,
        totalCompletionTokenUsage: 0,
        status: false
    }
]

const tenantKeyData = [
    {
        // id: 1,
        tenantName: "100",
        chatGptKey: CHAT_GPT_API_KEY,
    }
]

const ipAllowedData = [
    {
        ip: "127.0.0.1",
    },
    {
        ip: "localhost",
    }
]

let dateNow = new Date()

const dateInDbData =
    [
        {
            second: dateNow.getSeconds(),
            minutes: dateNow.getMinutes(),
            hours: dateNow.getHours(),
            day: dateNow.getDay(),
            month: dateNow.getMonth() + 1,
            year: dateNow.getFullYear()
        }
    ]



export async function SeedingRedis() {
    try {
        const getTenants = await clientRedis.get("tenants") ?? null
        // const getTenantKeys = await clientRedis.get("tenant_keys") ?? null
        const getIpAllowed = await clientRedis.get("ip_allowed") ?? null
        const getDateInDb = await clientRedis.get("date_in_db") ?? null

        if (getTenants == null || JSON.parse(getTenants).length == 0) {
            await clientRedis.set("tenants", JSON.stringify(tenantData))
        }

        // if (getTenantKeys == null || JSON.parse(getTenantKeys).length == 0) {
        //     await clientRedis.set("tenant_keys", JSON.stringify(tenantKeyData))
        // }

        if (getIpAllowed == null || JSON.parse(getIpAllowed).length == 0) {
            await clientRedis.set("ip_allowed", JSON.stringify(ipAllowedData))
        }

        if (getDateInDb == null || JSON.parse(getDateInDb).length == 0) {
            await clientRedis.set("date_in_db", JSON.stringify(dateInDbData))
        }

    } catch (error) {
        console.log('Failed seeded to redis ', error)

    }
}

export async function SeedingDb() {
    try {
        const tenants = await prisma.tenant.findMany();

        if (tenants.length == 0) {
            await prisma.tenant.createMany({
                data: tenantData
            });
        }

        const tenantKeys = await prisma.tenantKey.findMany();

        if (tenantKeys.length == 0) {
            await prisma.tenantKey.createMany({
                data: tenantKeyData
            });
        }

        const ipAllowed = await prisma.ipAllowed.findMany();

        if (ipAllowed.length == 0) {
            await prisma.ipAllowed.createMany({
                data: ipAllowedData
            });
        }

        const dateInDb = await prisma.dateInDb.findMany();

        if (dateInDb.length == 0) {
            await prisma.dateInDb.createMany({
                data: dateInDbData
            });
        }

    } catch (error) {
        console.log('Failed seeded to redis ', error)

    }
}
