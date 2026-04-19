// 1. The Game Engine (Pure Vanilla JS)
function processSeason(flatData) {
    
    // --- THE FLAT LLM SANITIZER ---
    let updatedState = {
        year: Number(flatData.year) || 1,
        season: Number(flatData.season) || 1,
        population: Number(flatData.population) || 0,
        storedRice: Number(flatData.storedRice) || 0,
        plantedRice: Number(flatData.plantedRice) || 0
    };

    const safeOrders = {
        dykeWorkers: Number(flatData.dykeWorkers) || 0,
        fieldWorkers: Number(flatData.fieldWorkers) || 0,
        villageGuards: Number(flatData.villageGuards) || 0,
        riceToPlant: Number(flatData.riceToPlant) || 0
    };

    const totalWorkers = safeOrders.dykeWorkers + safeOrders.fieldWorkers + safeOrders.villageGuards;

    if (totalWorkers > updatedState.population) {
        let failState = { ...updatedState, requiredQuestion: flatData.requiredQuestion || "" };
        return { nextStateForLLM: failState, stateForUI: updatedState, turnReport: `INVALID ORDERS: My Prince, you ordered ${totalWorkers} peasants to work, but we only have ${updatedState.population}. Are you counting ghosts?` };
    }

    let turnReport = "";

    // 1. SPRING (Season 1): Planting & Floods
    if (updatedState.season === 1) {
        
        // --- THE ROYAL BAILOUT ---
        if (updatedState.storedRice < 200) {
            let relief = 200 - updatedState.storedRice;
            updatedState.storedRice += relief;
            turnReport += `\n📦 EMERGENCY RELIEF: Your father, the Emperor, sent ${relief} sacks of seed rice because you are seemingly incapable of saving any! `;
        }

        if (safeOrders.riceToPlant > updatedState.storedRice) {
            let failState = { ...updatedState, requiredQuestion: flatData.requiredQuestion || "" };
            return { nextStateForLLM: failState, stateForUI: updatedState, turnReport: `INVALID ORDERS: My Prince, you commanded us to plant ${safeOrders.riceToPlant} rice, but we only have ${updatedState.storedRice}. You cannot plant air!` };
        }
        
        const maxPlantingCapacity = safeOrders.fieldWorkers * 50;
        if (safeOrders.riceToPlant > maxPlantingCapacity) {
            let failState = { ...updatedState, requiredQuestion: flatData.requiredQuestion || "" };
            return { nextStateForLLM: failState, stateForUI: updatedState, turnReport: `INVALID ORDERS: Your ${safeOrders.fieldWorkers} field workers can only plant a maximum of ${maxPlantingCapacity} sacks of rice. They only have two hands each!` };
        }

        updatedState.storedRice -= safeOrders.riceToPlant;
        updatedState.plantedRice = safeOrders.riceToPlant;

        if (safeOrders.riceToPlant > 0) {
            turnReport += `Your ${safeOrders.fieldWorkers} field planted ${safeOrders.riceToPlant} sacks of rice. `;
        }

        // LEVEL 2 HAZARD: Floods (Requires Pop >= 115)
        if (updatedState.population >= 115) {
            if (Math.random() < 0.3) {
                // THE FIX: Floods scale with population sprawl. Base 10-50, plus 25% of population.
                let sprawlPenalty = Math.floor(updatedState.population * 0.25);
                let floodStrength = Math.floor(Math.random() * 40) + 10 + sprawlPenalty; 
                
                if (safeOrders.dykeWorkers < floodStrength) {
                    let damage = floodStrength - safeOrders.dykeWorkers;
                    let drowned = Math.floor(damage / 2);
                    let washedAway = damage * 5;

                    updatedState.population = Math.max(0, updatedState.population - drowned);
                    updatedState.plantedRice = Math.max(0, updatedState.plantedRice - washedAway);

                    turnReport += `\n⚠️ THE RIVER WAKES! The flood overwhelmed your dyke workers! ${drowned} drowned and ${washedAway} seeds washed away. A brilliant start to the year! `;
                } else {
                    turnReport += `\n🌊 The river rose, but your ${safeOrders.dykeWorkers} dyke workers held it back. A rare success! `;
                }
            }
        } else if (safeOrders.dykeWorkers > 0) {
            turnReport += `\n🙄 You assigned ${safeOrders.dykeWorkers} peasants to guard a perfectly calm stream. A brilliant waste of labor. `;
        }
    }

    // 2. AUTUMN (Season 2): Harvesting
    if (updatedState.season === 2) {
        let plantedAmount = updatedState.plantedRice || 0;

        // THE FIX: RNG Yield Multiplier (between 3x and 7x)
        let yieldMultiplier = Math.floor(Math.random() * 5) + 3; 
        let baseYield = plantedAmount * yieldMultiplier;
        
        let maxYield = safeOrders.fieldWorkers * 50;
        let finalYield = Math.min(baseYield, maxYield);

        updatedState.storedRice += finalYield;
        if (finalYield > 0) {
            turnReport += `The harvest yielded ${finalYield} sacks of rice (a ${yieldMultiplier}x return!). `;
        } else if (plantedAmount > 0 && safeOrders.fieldWorkers === 0) {
            turnReport += `⚠️ DISASTER! You planted rice but assigned no field workers to harvest it. It all rotted. Your father will be thrilled. `;
        }

        updatedState.plantedRice = 0;
    }

    // 3. WINTER (Season 3): Thieves
    if (updatedState.season === 3) {
        // LEVEL 3 HAZARD: Bandits (Requires Pop >= 130)
        if (updatedState.population >= 130) {
            if (Math.random() < 0.6) {
                // THE FIX: Bandits scale with your wealth! Base 20-70, plus 2% of stored rice.
                let wealthPenalty = Math.floor(updatedState.storedRice * 0.02); 
                let thiefStrength = Math.floor(Math.random() * 50) + 20 + wealthPenalty; 
                
                if (safeOrders.villageGuards < thiefStrength) {
                    let stolenMultiplier = thiefStrength - safeOrders.villageGuards;
                    let stolenRice = stolenMultiplier * 50; 

                    stolenRice = Math.min(stolenRice, updatedState.storedRice);
                    updatedState.storedRice -= stolenRice;

                    if (stolenRice > 0) {
                        turnReport += `\n🗡️ BANDITS! Thieves smelled our wealth and attacked! Your guards failed, and ${stolenRice} sacks of rice were looted! `;
                    }
                } else {
                    turnReport += `\n🛡️ Bandits attacked, but your ${safeOrders.villageGuards} guards actually did their jobs and held the line! `;
                }
            }
        } else if (safeOrders.villageGuards > 0) {
            turnReport += `\n🙄 You posted ${safeOrders.villageGuards} guards in the freezing snow to protect our pitiful village from imaginary thieves. Masterful strategy, Your Highness. `;
        }
    }

    // 4. SURVIVAL: Now the villagers eat
    
    // THE CATCH-UP MECHANIC: Refugees
    if (updatedState.population < 40 && updatedState.population > 0) {
        let refugees = Math.floor(Math.random() * 20) + 10; 
        let refugeeRice = refugees * 15;
        updatedState.population += refugees;
        updatedState.storedRice += refugeeRice;
        turnReport += `\n⛺️ Desperate refugees (${refugees}) have arrived, bringing ${refugeeRice} sacks of scavenged rice. Try not to kill these ones. `;
    }

    // THE FIX: Lowered consumption from 5 to 2 per person per season
    const requiredRice = updatedState.population * 2; 
    let starved = 0;

    if (updatedState.storedRice >= requiredRice) {
        updatedState.storedRice -= requiredRice;
        turnReport += `\n🍲 The village consumed ${requiredRice} sacks of rice and survived your rule for another season. `;
        
        let growthRate = (Math.random() * 0.04) + 0.02;
        let newVillagers = Math.floor(updatedState.population * growthRate) + 1; 
        updatedState.population += newVillagers;
        turnReport += `Fools have heard of our full granaries! ${newVillagers} wandering peasants joined us.`;
        
    } else {
        const deficit = requiredRice - updatedState.storedRice;
        // THE FIX: Make sure the starvation rate matches the new consumption rate (divided by 2)
        starved = Math.ceil(deficit / 2);
        updatedState.population -= starved;
        turnReport += `\n💀 We needed ${requiredRice} rice but had ${updatedState.storedRice}. ${starved} peasants starved to death. A tragic day for the kingdom. `;
        updatedState.storedRice = 0;
    }


    // 5. SURVIVAL & TIME MARCHES ON (Permadeath)
    if (updatedState.population <= 0) {
        updatedState.population = 0;
        turnReport += `\n\n💀 GAME OVER. The last villager has perished. Your village is a graveyard. I shall inform your father of your total failure.`;
        updatedState.gameOver = true;
    } else {
        updatedState.season++;
        if (updatedState.season > 3) {
            updatedState.season = 1;
            updatedState.year++;
        }
        const seasonNames = { 1: "Growing", 2: "Harvest", 3: "Winter" };
        turnReport += `\n\nThe upcoming season is ${updatedState.season} (${seasonNames[updatedState.season]}).`;
        
        // --- NEW: SCOUT WARNINGS ---
        if (updatedState.population >= 110 && updatedState.population < 125) {
            turnReport += `\n🌊 VIZIER'S WARNING: Our population sprawls dangerously close to the riverbanks. We will soon need Dyke Workers during the Spring.`;
        }
        if (updatedState.population >= 125 && updatedState.population < 140) {
            turnReport += `\n🗡️ VIZIER'S WARNING: Our growing village has attracted the attention of mountain bandits. We will soon need Village Guards during the Winter.`;
        }
    }

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
    
    // Define the exact plain-English question the LLM MUST ask
    let requiredQuestion = "";
    
    // Check if hazards are active based on population
    const floodsActive = updatedState.population >= 115;
    const banditsActive = updatedState.population >= 130;

    if (updatedState.season === 1) {
        if (!floodsActive && !banditsActive) {
            requiredQuestion = "How many field workers and sacks of rice to plant shall we allocate? (The river is calm and bandits ignore us. Just assign 0 to dykes and guards).";
        } else if (floodsActive && !banditsActive) {
            requiredQuestion = "How many dyke workers, field workers, and sacks of rice to plant shall we allocate? (Assign 0 to guards).";
        } else {
            requiredQuestion = "How many dyke workers, field workers, village guards, and sacks of rice to plant shall we allocate, Your Highness?";
        }
    } else if (updatedState.season === 2) {
        if (!banditsActive) {
            requiredQuestion = "How many field workers shall we allocate for the harvest? (Assign 0 to dykes and guards).";
        } else {
            requiredQuestion = "How many dyke workers, field workers, and village guards shall we allocate, Your Highness?";
        }
    } else if (updatedState.season === 3) {
        if (!banditsActive) {
            requiredQuestion = "It is Winter. The fields are frozen and no bandits threaten us. (Just assign 0 to all workers and skip the turn).";
        } else {
             requiredQuestion = "How many dyke workers and village guards shall we allocate, Your Highness? (Remember, no farming in winter).";
        }
    }
    
    let nextStateForLLM = {
        ...updatedState,
        requiredQuestion: requiredQuestion
    };

    return { nextStateForLLM: nextStateForLLM, stateForUI: updatedState, turnReport: turnReport.trim() };
}
