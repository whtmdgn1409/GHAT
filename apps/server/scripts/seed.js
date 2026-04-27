import { createDatabase } from '../src/db/database.js';

const db = createDatabase();
const state = db.getState();
console.log(`Seed check complete: word packs=${state.wordPacks.length}`);
