import prisma from "../helpers/prisma_client";
import { TenantKeys } from "../types/tenant";

export const tenantKeyData:TenantKeys[] = []

export const fetchTenantKeys = async () => {

    try {
        const tenantKeys = await prisma.tenantKey.findMany();

        tenantKeys.map((val: any) => {
            if (!tenantKeyData.find((item) => item.tenantName === val.tenantName)) {
                tenantKeyData.push({
                    ...val
                })
            }
        })
    } catch (error) {
        console.log("❌ Failed fetch tenant keys with error: ", error)
    }
    
}