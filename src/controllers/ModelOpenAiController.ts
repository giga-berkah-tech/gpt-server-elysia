import prisma from "../helpers/prisma_client"
import { failedResponse, successDataResponse } from "../helpers/response_json";


export const getModelOpenAi = async () => {
    const getModelOpenAi = await prisma.modelOpenAi.findMany();
    if (getModelOpenAi.length > 0) {
        return successDataResponse(getModelOpenAi)
    }else{
        return failedResponse('Model OpenAi not found', 404)
    }
}