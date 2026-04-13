// 1. The Game Engine (Pure Vanilla JS)
function processSeason(flatData) {
    
    // --- THE FLAT LLM SANITIZER ---
    // Safely extract the current game state from the flat payload
    let updatedState = {
        year: Number(flatData.year) || 1,
        season: Number(flatData.season) || 1,
        population: Number(flatData.population) || 0,
        storedRice: Number(flatData.storedRice) || 0,
        plantedRice: Number(flatData.plantedRice) || 0
    };

    // Safely extract the worker orders from the same flat payload
    const safeOrders = {
        dykeWorkers: Number(flatData.dykeWorkers) || 0,
        fieldWorkers: Number(flatData.fieldWorkers) || 0,
        villageGuards: Number(flatData.villageGuards) || 0,
        riceToPlant: Number(flatData.riceToPlant) || 0
    };

    const totalWorkers = safeOrders.dykeWorkers + safeOrders.fieldWorkers + safeOrders.villageGuards;

    if (totalWorkers > updatedState.population) {
        // If orders are invalid, return the exact same flat state so the LLM can try again
        let failState = { ...updatedState, requestedOrders: flatData.requestedOrders || [] };
        return { nextStateForLLM: failState, stateForUI: updatedState, turnReport: `INVALID ORDERS: My Emperor, you ordered ${totalWorkers} peasants to work, but we only have ${updatedState.population}!` };
    }

    let turnReport = "";

    // 1. SPRING (Season 1): Planting & Floods
    if (updatedState.season === 1) {
        if (safeOrders.riceToPlant > updatedState.storedRice) {
            let failState = { ...updatedState, requestedOrders: flatData.requestedOrders || [] };
            return { nextStateForLLM: failState, stateForUI: updatedState, turnReport: `INVALID ORDERS: My Emperor, you commanded us to plant ${safeOrders.riceToPlant} rice, but we only have ${updatedState.storedRice}!` };
        }
        
        const maxPlantingCapacity = safeOrders.fieldWorkers * 50;
        if (safeOrders.riceToPlant > maxPlantingCapacity) {
            let failState = { ...updatedState, requestedOrders: flatData.requestedOrders || [] };
            return { nextStateForLLM: failState, stateForUI: updatedState, turnReport: `INVALID ORDERS: My Emperor, our ${safeOrders.fieldWorkers} field workers can only plant a maximum of ${maxPlantingCapacity} sacks of rice!` };
        }

        updatedState.storedRice -= safeOrders.riceToPlant;
        updatedState.plantedRice = safeOrders.riceToPlant;

        if (safeOrders.riceToPlant > 0) {
            turnReport += `Our ${safeOrders.fieldWorkers} field workers planted ${safeOrders.riceToPlant} sacks of rice. `;
        }

        // HAZARD: Floods (30% chance in Spring)
        if (Math.random() < 0.3) {
            let floodStrength = Math.floor(Math.random() * 40) + 10; 
            if (safeOrders.dykeWorkers < floodStrength) {
                let damage = floodStrength - safeOrders.dykeWorkers;
                let drowned = Math.floor(damage / 2);
                let washedAway = damage * 5;

                updatedState.population = Math.max(0, updatedState.population - drowned);
                updatedState.plantedRice = Math.max(0, updatedState.plantedRice - washedAway);

                turnReport += `\n⚠️ DISASTER! The river flooded! Our dyke workers were overwhelmed. ${drowned} peasants drowned and ${washedAway} sacks of planted seed washed away! `;
            } else {
                turnReport += `\n🌊 The river rose dangerously high, but our ${safeOrders.dykeWorkers} dyke workers held the waters back! `;
            }
        }
    }

    // 2. AUTUMN (Season 2): Harvesting (RESTORED)
    if (updatedState.season === 2) {
        let plantedAmount = updatedState.plantedRice || 0;

        let baseYield = plantedAmount * 3;
        let maxYield = safeOrders.fieldWorkers * 50;
        let finalYield = Math.min(baseYield, maxYield);

        updatedState.storedRice += finalYield;
        if (finalYield > 0) {
            turnReport += `The harvest yielded ${finalYield} sacks of rice. `;
        } else if (plantedAmount > 0 && safeOrders.fieldWorkers === 0) {
            turnReport += `⚠️ DISASTER! We planted rice but assigned no field workers to harvest it. It all rotted in the fields! `;
        }

        updatedState.plantedRice = 0;
    }

    // 3. WINTER (Season 3): Thieves
    if (updatedState.season === 3) {
        // HAZARD: Bandits (40% chance in Winter)
        if (Math.random() < 0.4) {
            let thiefStrength = Math.floor(Math.random() * 30) + 5; 
            if (safeOrders.villageGuards < thiefStrength) {
                let stolenMultiplier = thiefStrength - safeOrders.villageGuards;
                let stolenRice = stolenMultiplier * 25;

                stolenRice = Math.min(stolenRice, updatedState.storedRice);
                updatedState.storedRice -= stolenRice;

                if (stolenRice > 0) {
                    turnReport += `\n🗡️ BANDITS! Thieves attacked the granary in the dead of winter! The guards were outnumbered, and ${stolenRice} sacks of rice were stolen! `;
                }
            } else {
                turnReport += `\n🛡️ Bandits probed our defenses, but our ${safeOrders.villageGuards} village guards drove them off! `;
            }
        }
    }

    // 4. SURVIVAL: Now the villagers eat
    const requiredRice = updatedState.population * 5; 
    let starved = 0;

    if (updatedState.storedRice >= requiredRice) {
        updatedState.storedRice -= requiredRice;
        turnReport += `\n🍲 The village consumed ${requiredRice} sacks of rice and is well-fed. `;
        
        let growthRate = (Math.random() * 0.04) + 0.02;
        let newVillagers = Math.floor(updatedState.population * growthRate) + 1; 
        updatedState.population += newVillagers;
        turnReport += `News of our full granaries has spread! ${newVillagers} wandering peasants have joined our village.`;
        
    } else {
        const deficit = requiredRice - updatedState.storedRice;
        starved = Math.ceil(deficit / 5);
        updatedState.population -= starved;
        turnReport += `\n💀 We only had ${updatedState.storedRice} rice, but needed ${requiredRice}. ${starved} peasants starved to death! `;
        updatedState.storedRice = 0;
    }


    // 5. TIME MARCHES ON
    updatedState.season++;
    if (updatedState.season > 3) {
        updatedState.season = 1;
        updatedState.year++;
    }

    const seasonNames = { 1: "Growing", 2: "Harvest", 3: "Winter" };
    turnReport += `\n\nThe upcoming season is ${updatedState.season} (${seasonNames[updatedState.season]}).`;

    // Draw the map
    try {
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            const popCount = Math.max(0, Math.ceil(Number(updatedState.population) / 20) || 0);
            const riceCount = Math.max(0, Math.ceil(Number(updatedState.storedRice) / 500) || 0);
            const plantedCount = Math.max(0, Math.ceil(Number(updatedState.plantedRice) / 500) || 0);
            
            mapContainer.innerHTML = `
                        <div><strong>Year: ${updatedState.year} | Season: ${updatedState.season}</strong></div>
                        <div style="margin: 20px 0;">🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦</div>
                        <div><strong>Villagers:</strong><br/> ${"🧑‍🌾".repeat(popCount) || "💀 (Ghost Town)"}</div>
                        <div style="margin: 10px 0;"><strong>Granary (Stored):</strong><br/> ${"🌾".repeat(riceCount) || "Empty!"}</div>
                        <div style="margin: 10px 0;"><strong>Fields (Planted):</strong><br/> ${"🌱".repeat(plantedCount) || "Barren"}</div>
                        <div class="stats" style="margin-bottom: 10px;">Pop: ${updatedState.population} | Stored: ${updatedState.storedRice} | Planted: ${updatedState.plantedRice}</div>
                        
                        <div style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 5px; font-size: 0.9em; text-align: left;">
                            <strong>📜 Vizier's Report:</strong><br/>
                            ${turnReport.trim()}
                        </div>
                    `;
        }
    } catch (e) { }
    
    // Define what the LLM should ask the Emperor for the UPCOMING season
    let nextTurnOrders = [];
    if (updatedState.season === 1) {
        nextTurnOrders = ["dykeWorkers", "fieldWorkers", "villageGuards", "riceToPlant"];
    } else if (updatedState.season === 2) {
        nextTurnOrders = ["dykeWorkers", "fieldWorkers", "villageGuards"];
    } else if (updatedState.season === 3) {
        nextTurnOrders = ["dykeWorkers", "villageGuards"]; // No farming in Winter!
    }
    
    // Create the final flat payload to send back to the LLM
    let nextStateForLLM = {
        ...updatedState,
        requestedOrders: nextTurnOrders
    };

    return { nextStateForLLM: nextStateForLLM, stateForUI: updatedState, turnReport: turnReport.trim() };
}
