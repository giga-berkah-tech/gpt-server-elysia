
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET_KEY } from "../utils/constants";
import { Context } from 'elysia';
import { clientRedis } from '..';
import { SeedingDb, SeedingRedis } from '../seed/seed';
import { fetchTenantKeys } from './LoadDataService';


export const checkValidToken = (c: Context) => {
 
  try {
    const token = c.headers.authorization
    jwt.verify(token ?? "", JWT_SECRET_KEY ?? "IS_A_SECRET_KEY");
    return true
  } catch (error: any) {
    console.log(error)
    return false
  }
}

export const checkConnRedis = async () => {
  try {
    clientRedis
      .on('error', (err) => console.log('❌ Redis Failed to connect with error: ', err))
      .connect().then(() => {
        SeedingRedis().then(() => console.log('✅ Successfully seeded to redis')).catch((e) => console.log('❌ Failed seeded to redis'))
        SeedingDb().then(() =>{
          console.log('✅ Successfully seeded to Db postgree')
          fetchTenantKeys()
        }).catch((e) => console.log('❌ Failed seeded to Db postgree'))
      })

  } catch (e: any) {
    console.log('❌ Failed connection to redis check with error: ', e)
  }
}