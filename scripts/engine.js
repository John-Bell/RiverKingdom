window['ai_edge_gallery_get_result'] = async (data) => {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        // --- 1. COMBINED LOAD / AUTO-INIT ---
        if (parsedData.action === "load") {
            const savedData = localStorage.getItem('riverKingdomSave');
            if (savedData) {
                // Load existing game
                const loadedState = JSON.parse(savedData);
                const stateString = encodeURIComponent(JSON.stringify(loadedState));

                return JSON.stringify({
                    result: `I found the records of your village. We are in Year ${loadedState.year}, Season ${loadedState.season}. Let us see how badly you are managing things today.\n\nDATA FOR VIZIER:\nYear: ${loadedState.year} | Season: ${loadedState.season} | Population: ${loadedState.population} | Stored Rice: ${loadedState.storedRice}\nAvailable Actions: ${loadedState.availableActions}`,
                    webview: { url: `webview.html?state=${stateString}`, aspectRatio: 1.333 }
                });
            } else {
                // Auto-start new game if no save exists
                const initState = {
                    year: 1, season: 1, population: 100, storedRice: 1200, plantedRice: 0,
                    availableActions: "Roles available: dyke workers, field workers, village guards, and sacks of rice to plant."
                };
                localStorage.setItem('riverKingdomSave', JSON.stringify(initState));
                const stateString = encodeURIComponent(JSON.stringify(initState));
                
                return JSON.stringify({
                    result: `Your father, the Emperor, has dumped this pitiful patch of dirt into your lap. Try not to starve everyone immediately.\n\nDATA FOR VIZIER:\nYear: 1 | Season: 1 | Population: 100 | Stored Rice: 1200\nAvailable Actions: ${initState.availableActions}`,
                    webview: { url: `webview.html?state=${stateString}`, aspectRatio: 1.333 }
                });
            }
        }

        // --- 2. EXPLICIT NEW GAME (Overwrites Save) ---
        if (parsedData.action === "init") {
            const initState = {
                year: 1, season: 1, population: 100, storedRice: 1200, plantedRice: 0,
                availableActions: "Roles available: dyke workers, field workers, village guards, and sacks of rice to plant."
            };
            localStorage.setItem('riverKingdomSave', JSON.stringify(initState));
            const stateString = encodeURIComponent(JSON.stringify(initState));
            
            return JSON.stringify({
                result: `You burned the last village to the ground. Your father has graciously given you another one. Please do better.\n\nDATA FOR VIZIER:\nYear: 1 | Season: 1 | Population: 100 | Stored Rice: 1200\nAvailable Actions: ${initState.availableActions}`,
                webview: { url: `webview.html?state=${stateString}`, aspectRatio: 1.333 }
            });
        }

        // --- 3. NORMAL TURN PROCESSING ---
        
        // Retrieve the actual, uncorrupted game state from memory
        const savedData = localStorage.getItem('riverKingdomSave');
        const currentState = savedData ? JSON.parse(savedData) : {};
        
        // Merge the true state with the LLM's incoming orders
        const combinedData = { ...currentState, ...parsedData };

        // Process the season using the combined data
        const nextTurn = processSeason(combinedData);
        
        // SAVE OR WIPE THE GAME STATE
        // As long as the turn didn't fail from invalid orders...
        if (!nextTurn.turnReport.includes("INVALID ORDERS")) {
            // If the population hit 0, burn the save file!
            if (nextTurn.nextStateForLLM.gameOver) {
                localStorage.removeItem('riverKingdomSave');
            } else {
                // Otherwise, save normally
                localStorage.setItem('riverKingdomSave', JSON.stringify(nextTurn.nextStateForLLM));
            }
        }

        const stateString = encodeURIComponent(JSON.stringify(nextTurn.stateForUI));

        // Return clean JSON without the hidden state baggage, but WITH the new stats for the LLM to read
        return JSON.stringify({
            result: `${nextTurn.turnReport}\n\nDATA FOR VIZIER:\nYear: ${nextTurn.nextStateForLLM.year} | Season: ${nextTurn.nextStateForLLM.season} | Population: ${nextTurn.nextStateForLLM.population} | Stored Rice: ${nextTurn.nextStateForLLM.storedRice}\nAvailable Actions: ${nextTurn.nextStateForLLM.availableActions}`,
            webview: {
                url: `webview.html?state=${stateString}`,
                aspectRatio: 1.333
            }
        });

    } catch (e) {
        return JSON.stringify({ error: e.message || e.toString() });
    }
};
