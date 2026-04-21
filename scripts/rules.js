// ==========================================
// GAME CONFIGURATION & BALANCE TWEAKS
// ==========================================
const GAME_CONFIG = {
    // Economics
    RICE_PER_FIELD_WORKER: 50,
    CONSUMPTION_PER_PERSON: 2,
    YIELD_MIN_MULTIPLIER: 3,
    YIELD_MAX_MULTIPLIER: 7,
    
    // Starvation Cap
    MAX_STARVATION_PCT: 0.60, // Maximum 60% of population can starve in one season
    
    // Floods
    FLOOD_CHANCE_SPRING: 0.30,
    FLOOD_CHANCE_BASE: 0.10,
    FLOOD_MAX_POP_LOSS_PCT: 0.20, // At worst (0 workers), lose 20% of population
    FLOOD_MAX_SEED_LOSS_PCT: 0.40, // At worst, lose 40% of planted seeds
    
    // Bandits
    BANDIT_CHANCE_WINTER: 0.30,
    BANDIT_CHANCE_BASE: 0.10,
    BANDIT_HOARD_THRESHOLD: 10,    // Having 10x required food triggers hoard penalty
    BANDIT_HOARD_PENALTY: 0.30,    // +30% chance of bandits if hoarding
    BANDIT_MAX_RICE_LOSS_PCT: 0.30 // At worst (0 guards), lose 30% of stored rice
};

// ==========================================
// MAIN ENGINE
// ==========================================
function processSeason(flatData) {
    let state = sanitizeInput(flatData);
    let orders = sanitizeOrders(flatData);

    const totalWorkers = orders.dykeWorkers + orders.fieldWorkers + orders.villageGuards;

    // Validate worker count
    if (totalWorkers > state.population) {
        let failState = { ...state, requiredQuestion: flatData.requiredQuestion || "" };
        return formatResponse(failState, state, `INVALID ORDERS: My Prince, you ordered ${totalWorkers} peasants to work, but we only have ${state.population}. Are you counting ghosts?`);
    }

    let turnReport = "";

    // 1. Season Specific Work (Planting / Harvesting)
    turnReport += executeSeasonWork(state, orders);

    // 2. Hazards (Floods & Bandits)
    turnReport += executeHazards(state, orders);

    // 3. Survival (Eating & Starvation)
    turnReport += executeSurvival(state);

    // 4. Time Progression & Game Over Check
    turnReport += advanceTime(state);

    // 5. Render Map & UI
    renderUI(state, turnReport);

    // 6. Output to LLM
    let nextStateForLLM = {
        ...state,
        availableActions: getAvailableActions(state.season)
    };

    return formatResponse(nextStateForLLM, state, turnReport.trim());
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function executeSeasonWork(state, orders) {
    let report = "";

    // SPRING: Planting
    if (state.season === 1) {
        if (state.storedRice < 200) {
            let relief = 200 - state.storedRice;
            state.storedRice += relief;
            report += `\n📦 EMERGENCY RELIEF: Your father sent ${relief} sacks of seed rice. `;
        }

        if (orders.riceToPlant > state.storedRice) {
            return `INVALID ORDERS: You commanded us to plant ${orders.riceToPlant} rice, but we only have ${state.storedRice}. You cannot plant air!`;
        }
        
        const maxCapacity = orders.fieldWorkers * GAME_CONFIG.RICE_PER_FIELD_WORKER;
        if (orders.riceToPlant > maxCapacity) {
            return `INVALID ORDERS: Your ${orders.fieldWorkers} field workers can only plant a maximum of ${maxCapacity} sacks of rice.`;
        }

        state.storedRice -= orders.riceToPlant;
        state.plantedRice = orders.riceToPlant;

        if (orders.riceToPlant > 0) {
            report += `Your ${orders.fieldWorkers} field workers planted ${orders.riceToPlant} sacks of rice. `;
        }
    }

    // AUTUMN: Harvesting
    if (state.season === 2) {
        let plantedAmount = state.plantedRice || 0;
        let yieldMultiplier = Math.floor(Math.random() * (GAME_CONFIG.YIELD_MAX_MULTIPLIER - GAME_CONFIG.YIELD_MIN_MULTIPLIER + 1)) + GAME_CONFIG.YIELD_MIN_MULTIPLIER; 
        let baseYield = plantedAmount * yieldMultiplier;
        
        let maxYield = orders.fieldWorkers * GAME_CONFIG.RICE_PER_FIELD_WORKER;
        let finalYield = Math.min(baseYield, maxYield);

        state.storedRice += finalYield;
        if (finalYield > 0) {
            report += `The harvest yielded ${finalYield} sacks of rice (a ${yieldMultiplier}x return!). `;
        } else if (plantedAmount > 0 && orders.fieldWorkers === 0) {
            report += `⚠️ DISASTER! You planted rice but assigned no field workers to harvest it. It rotted. `;
        }
        state.plantedRice = 0;
    }

    return report;
}

function executeHazards(state, orders) {
    let report = "";

    // -- FLOODS --
    let floodChance = state.season === 1 ? GAME_CONFIG.FLOOD_CHANCE_SPRING : GAME_CONFIG.FLOOD_CHANCE_BASE;
    if (Math.random() < floodChance) {
        let sprawlPenalty = Math.floor(state.population * 0.25);
        let floodThreat = Math.floor(Math.random() * 40) + 10 + sprawlPenalty; 
        
        // Calculate how well defended we are (0.0 to 1.0)
        let defenseRatio = floodThreat > 0 ? (orders.dykeWorkers / floodThreat) : 1;
        defenseRatio = Math.min(defenseRatio, 1); 

        if (defenseRatio < 1) {
            let damageMultiplier = 1 - defenseRatio; // e.g. if 20% defended, take 80% of max damage
            
            let drowned = Math.floor(state.population * GAME_CONFIG.FLOOD_MAX_POP_LOSS_PCT * damageMultiplier);
            let washedAway = Math.floor(state.plantedRice * GAME_CONFIG.FLOOD_MAX_SEED_LOSS_PCT * damageMultiplier);

            state.population = Math.max(0, state.population - drowned);
            state.plantedRice = Math.max(0, state.plantedRice - washedAway);

            report += `\n⚠️ THE RIVER WAKES! Your dykes were insufficient. ${drowned} drowned and ${washedAway} seeds washed away. `;
        } else {
            report += `\n🌊 The river rose, but your ${orders.dykeWorkers} dyke workers held it back. `;
        }
    } else if (orders.dykeWorkers > 0) {
        report += `\n🙄 You assigned ${orders.dykeWorkers} peasants to guard a perfectly calm stream. `;
    }

    // -- BANDITS --
    let thiefChance = state.season === 3 ? GAME_CONFIG.BANDIT_CHANCE_WINTER : GAME_CONFIG.BANDIT_CHANCE_BASE;
    if (state.storedRice > (state.population * GAME_CONFIG.BANDIT_HOARD_THRESHOLD)) {
        thiefChance += GAME_CONFIG.BANDIT_HOARD_PENALTY; 
    }

    if (Math.random() < thiefChance) {
        let wealthPenalty = Math.floor(state.storedRice * 0.02); 
        let thiefThreat = Math.floor(Math.random() * 50) + 20 + wealthPenalty; 
        
        // Calculate defense ratio
        let defenseRatio = thiefThreat > 0 ? (orders.villageGuards / thiefThreat) : 1;
        defenseRatio = Math.min(defenseRatio, 1);

        if (defenseRatio < 1) {
            let damageMultiplier = 1 - defenseRatio;
            let stolenRice = Math.floor(state.storedRice * GAME_CONFIG.BANDIT_MAX_RICE_LOSS_PCT * damageMultiplier);

            state.storedRice -= stolenRice;
            report += `\n🗡️ BANDITS! Thieves attacked! Your guards were overwhelmed, and ${stolenRice} sacks of rice were looted! `;
        } else {
            report += `\n🛡️ Bandits attacked, but your ${orders.villageGuards} guards held the line! `;
        }
    } else if (orders.villageGuards > 0) {
        report += `\n🙄 You posted ${orders.villageGuards} guards to protect against imaginary thieves. `;
    }

    return report;
}

function executeSurvival(state) {
    let report = "";

    // Refugees (Catch-up mechanic)
    if (state.population < 40 && state.population > 0) {
        let refugees = Math.floor(Math.random() * 20) + 10; 
        let refugeeRice = refugees * 15;
        state.population += refugees;
        state.storedRice += refugeeRice;
        report += `\n⛺️ Desperate refugees (${refugees}) arrived, bringing ${refugeeRice} sacks of scavenged rice. `;
    }

    // Feeding the village
    const requiredRice = state.population * GAME_CONFIG.CONSUMPTION_PER_PERSON; 
    
    if (state.storedRice >= requiredRice) {
        state.storedRice -= requiredRice;
        report += `\n🍲 The village consumed ${requiredRice} rice and survived. `;
        
        // Growth
        let growthRate = (Math.random() * 0.04) + 0.02;
        let newVillagers = Math.floor(state.population * growthRate) + 1; 
        state.population += newVillagers;
        report += ` ${newVillagers} wandering peasants joined us.`;
        
    } else {
        // Starvation logic based on percentage max limits
        const deficit = requiredRice - state.storedRice;
        let rawStarved = Math.ceil(deficit / GAME_CONFIG.CONSUMPTION_PER_PERSON);
        let maxStarved = Math.floor(state.population * GAME_CONFIG.MAX_STARVATION_PCT);
        let starved = Math.min(rawStarved, maxStarved);
        
        state.population -= starved;
        report += `\n💀 We needed ${requiredRice} rice but had ${state.storedRice}. ${starved} peasants starved. `;
        state.storedRice = 0;
    }

    return report;
}

function advanceTime(state) {
    let report = "";
    if (state.population <= 0) {
        state.population = 0;
        state.gameOver = true;
        report += `\n\n💀 GAME OVER. The last villager has perished.`;
    } else {
        state.season++;
        if (state.season > 3) {
            state.season = 1;
            state.year++;
        }
        const seasonNames = { 1: "Growing", 2: "Harvest", 3: "Winter" };
        report += `\n\nThe upcoming season is ${state.season} (${seasonNames[state.season]}).`;
    }
    return report;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function sanitizeInput(flatData) {
    return {
        year: Number(flatData.year) || 1,
        season: Number(flatData.season) || 1,
        population: Number(flatData.population) || 0,
        storedRice: Number(flatData.storedRice) || 0,
        plantedRice: Number(flatData.plantedRice) || 0
    };
}

function sanitizeOrders(flatData) {
    return {
        dykeWorkers: Number(flatData.dykeWorkers) || 0,
        fieldWorkers: Number(flatData.fieldWorkers) || 0,
        villageGuards: Number(flatData.villageGuards) || 0,
        riceToPlant: Number(flatData.riceToPlant) || 0
    };
}

function formatResponse(nextStateForLLM, stateForUI, turnReport) {
    return { nextStateForLLM, stateForUI, turnReport };
}

function getAvailableActions(season) {
    if (season === 1) return "Roles available: dyke workers, field workers, village guards, and sacks of rice to plant.";
    if (season === 2) return "Roles available: dyke workers, field workers, and village guards.";
    if (season === 3) return "Roles available: dyke workers and village guards (No farming in Winter).";
    return "";
}

function renderUI(state, turnReport) {
    try {
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            const popCount = Math.max(0, Math.ceil(Number(state.population) / 20) || 0);
            const riceCount = Math.max(0, Math.ceil(Number(state.storedRice) / 500) || 0);
            const plantedCount = Math.max(0, Math.ceil(Number(state.plantedRice) / 500) || 0);
            
            mapContainer.innerHTML = `
                <div><strong>Year: ${state.year} | Season: ${state.season}</strong></div>
                <div style="margin: 20px 0;">🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦</div>
                <div><strong>Villagers:</strong><br/> ${"🧑‍🌾".repeat(popCount) || "💀 (Ghost Town)"}</div>
                <div style="margin: 10px 0;"><strong>Granary (Stored):</strong><br/> ${"🌾".repeat(riceCount) || "Empty!"}</div>
                <div style="margin: 10px 0;"><strong>Fields (Planted):</strong><br/> ${"🌱".repeat(plantedCount) || "Barren"}</div>
                <div class="stats" style="margin-bottom: 10px;">Pop: ${state.population} | Stored: ${state.storedRice} | Planted: ${state.plantedRice}</div>
                
                <div style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 5px; font-size: 0.9em; text-align: left;">
                    <strong>📜 Vizier's Report:</strong><br/>
                    ${turnReport.trim()}
                </div>
            `;
        }
    } catch (e) { }
}
