// 1. The Game Engine (Pure Vanilla JS)
function processSeason(state, orders) {
    const totalWorkers = Number(orders.dykeWorkers) + Number(orders.fieldWorkers) + Number(orders.villageGuards);

    if (totalWorkers > state.population) {
        return { state: state, turnReport: `INVALID ORDERS: My Emperor, you ordered ${totalWorkers} peasants to work, but we only have ${state.population}!` };
    }

    let turnReport = "";
    let updatedState = JSON.parse(JSON.stringify(state)); // Safe copy

    // 1. SPRING (Season 1): Planting & Floods
    if (updatedState.season === 1) {
        // Check if we have enough rice in the granary
        if (orders.riceToPlant > updatedState.storedRice) {
            return { state: state, turnReport: `INVALID ORDERS: My Emperor, you commanded us to plant ${orders.riceToPlant} rice, but we only have ${updatedState.storedRice}!` };
        }
        
        // NEW: Enforce planting capacity! (1 worker can plant 50 sacks)
        const maxPlantingCapacity = orders.fieldWorkers * 50;
        if (orders.riceToPlant > maxPlantingCapacity) {
            return { state: state, turnReport: `INVALID ORDERS: My Emperor, our ${orders.fieldWorkers} field workers can only plant a maximum of ${maxPlantingCapacity} sacks of rice!` };
        }

        // Apply the planting to the state
        updatedState.storedRice -= orders.riceToPlant;
        updatedState.plantedRice = orders.riceToPlant;

        if (orders.riceToPlant > 0) {
            turnReport += `Our ${orders.fieldWorkers} field workers planted ${orders.riceToPlant} sacks of rice. `;
        }

        // HAZARD: Floods (30% chance in Spring)
        if (Math.random() < 0.3) {
            let floodStrength = Math.floor(Math.random() * 40) + 10; // Strength between 10 and 50
            if (orders.dykeWorkers < floodStrength) {
                let damage = floodStrength - orders.dykeWorkers;
                let drowned = Math.floor(damage / 2);
                let washedAway = damage * 5;

                updatedState.population = Math.max(0, updatedState.population - drowned);
                updatedState.plantedRice = Math.max(0, updatedState.plantedRice - washedAway);

                turnReport += `\n⚠️ DISASTER! The river flooded! Our dyke workers were overwhelmed. ${drowned} peasants drowned and ${washedAway} sacks of planted seed washed away! `;
            } else {
                turnReport += `\n🌊 The river rose dangerously high, but our ${orders.dykeWorkers} dyke workers held the waters back! `;
            }
        }
    }


    // 3. WINTER (Season 3): Thieves
    if (updatedState.season === 3) {
        // HAZARD: Bandits (40% chance in Winter)
        if (Math.random() < 0.4) {
            let thiefStrength = Math.floor(Math.random() * 30) + 5; // Strength between 5 and 35
            if (orders.villageGuards < thiefStrength) {
                let stolenMultiplier = thiefStrength - orders.villageGuards;
                let stolenRice = stolenMultiplier * 25;

                // Ensure they don't steal more than we have
                stolenRice = Math.min(stolenRice, updatedState.storedRice);
                updatedState.storedRice -= stolenRice;

                if (stolenRice > 0) {
                    turnReport += `\n🗡️ BANDITS! Thieves attacked the granary in the dead of winter! The guards were outnumbered, and ${stolenRice} sacks of rice were stolen! `;
                }
            } else {
                turnReport += `\n🛡️ Bandits probed our defenses, but our ${orders.villageGuards} village guards drove them off! `;
            }
        }
    }

    // 4. SURVIVAL: Now the villagers eat
    const requiredRice = updatedState.population * 5; 
    let starved = 0;

    if (updatedState.storedRice >= requiredRice) {
        updatedState.storedRice -= requiredRice;
        turnReport += `\n🍲 The village consumed ${requiredRice} sacks of rice and is well-fed. `;
        
        // NEW: Population Growth! (Roughly 2% to 6% growth if well-fed)
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
            mapContainer.innerHTML = `
                        <div><strong>Year: ${updatedState.year} | Season: ${updatedState.season}</strong></div>
                        <div style="margin: 20px 0;">🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦</div>
                        <div><strong>Villagers:</strong><br/> ${"🧑‍🌾".repeat(popCount) || "💀 (Ghost Town)"}</div>
                        <div style="margin: 10px 0;"><strong>Granary:</strong><br/> ${"🌾".repeat(riceCount) || "Empty!"}</div>
                        <div class="stats">Population: ${updatedState.population} | Stored Rice: ${updatedState.storedRice}</div>
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
    
    // Attach it directly to the state
    updatedState.requestedOrders = nextTurnOrders;


    return { state: updatedState, turnReport: turnReport.trim() };
}