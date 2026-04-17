window['ai_edge_gallery_get_result'] = async (data) => {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        // --- COMBINED LOAD / AUTO-INIT ---
        if (parsedData.action === "load") {
            const savedData = localStorage.getItem('riverKingdomSave');
            if (savedData) {
                // Load existing game
                const loadedState = JSON.parse(savedData);
                const stateString = encodeURIComponent(JSON.stringify(loadedState));
                const systemStateString = JSON.stringify(loadedState);

                return JSON.stringify({
                    result: `I found the records of your village. We are in Year ${loadedState.year}, Season ${loadedState.season}. Let us see how badly you are managing things today.\n\n[HIDDEN SYSTEM STATE FOR NEXT TURN: ${systemStateString}]`,
                    webview: { url: `webview.html?state=${stateString}`, aspectRatio: 1.333 }
                });
            } else {
                // Auto-start new game if no save exists
                const initState = {
                    year: 1, season: 1, population: 100, storedRice: 1200, plantedRice: 0,
                    requiredQuestion: "How many dyke workers, field workers, village guards, and sacks of rice to plant shall we allocate, Your Highness?"
                };
                localStorage.setItem('riverKingdomSave', JSON.stringify(initState));
                
                const stateString = encodeURIComponent(JSON.stringify(initState));
                const systemStateString = JSON.stringify(initState);
                
                return JSON.stringify({
                    result: `Your father, the Emperor, has dumped this pitiful patch of dirt into your lap. Try not to starve everyone immediately.\n\n[HIDDEN SYSTEM STATE FOR NEXT TURN: ${systemStateString}]`,
                    webview: { url: `webview.html?state=${stateString}`, aspectRatio: 1.333 }
                });
            }
        }

        // --- EXPLICIT NEW GAME (Overwrites Save) ---
        if (parsedData.action === "init") {
            const initState = {
                year: 1, season: 1, population: 100, storedRice: 1200, plantedRice: 0,
                requiredQuestion: "How many dyke workers, field workers, village guards, and sacks of rice to plant shall we allocate, Your Highness?"
            };
            localStorage.setItem('riverKingdomSave', JSON.stringify(initState));
            
            const stateString = encodeURIComponent(JSON.stringify(initState));
            const systemStateString = JSON.stringify(initState);
            
            return JSON.stringify({
                result: `You burned the last village to the ground. Your father has graciously given you another one. Please do better.\n\n[HIDDEN SYSTEM STATE FOR NEXT TURN: ${systemStateString}]`,
                webview: { url: `webview.html?state=${stateString}`, aspectRatio: 1.333 }
            });
        }
        
        // ... (Keep the rest of your normal turn processing below)


        // --- 3. NORMAL TURN PROCESSING ---
        const nextTurn = processSeason(parsedData);
        
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
        const systemStateString = JSON.stringify(nextTurn.nextStateForLLM);

        return JSON.stringify({
            result: nextTurn.turnReport + `\n\n[HIDDEN SYSTEM STATE FOR NEXT TURN: ${systemStateString}]`,
            webview: {
                url: `webview.html?state=${stateString}`,
                aspectRatio: 1.333
            }
        });

    } catch (e) {
        return JSON.stringify({ error: e.message || e.toString() });
    }
};
