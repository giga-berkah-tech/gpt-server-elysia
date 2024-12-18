import Elysia from "elysia";
import { getDateInDb, updateDateNow } from "../controllers/DateInDbController";

const Routes = new Elysia()

.get(`/`, () => getDateInDb())
.put(`/update`, () => updateDateNow())


export const DateInDbRoutes = Routes;