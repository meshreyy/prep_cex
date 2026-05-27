//loads balance from db when engine starts
//this way even if the engine restarts, it doesn't lose all balances

//connects to postgres 


import {prisma} from "@perp/shared-db";
import { BALANCES } from "../store/perp-store";


//use prisma to load all balances form db
// prisma.balance.findMany(): fetches all the records from the table 

//findMany() - returns an array
export async function hydrateEngine() {
    const balances = await prisma.balance.findMany();

    //loop through the results and set them in BALANCES map
    for (const record of balances) {
        BALANCES.set(record.userId, { available : record.available, locked : record.locked});
        
    }

    console.log('Loaded ${balances.length} balances');

}









