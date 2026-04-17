window['ai_edge_gallery_get_result'] = async (data) => {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        // --- NEW: LOAD SAVED GAME ---
        if (parsedData.action === "load") {
            const savedData = localStorage.getItem('riverKingdomSave');
            if (savedData) {
                const loadedState = JSON.parse(savedData);
                const stateString = encodeURIComponent(JSON.stringify(loadedState));
                const systemStateString = JSON.stringify(loadedState);

                return JSON.stringify({
                    result: `The royal archives have been retrieved! Welcome back, Emperor. We are currently in Year ${loadedState.year}, Season ${loadedState.season}.\n\n[HIDDEN SYSTEM STATE FOR NEXT TURN: ${systemStateString}]`,
                    webview: {
                        url: `webview.html?state=${stateString}`,
                        aspectRatio: 1.333
                    }
                });
            } else {
                return JSON.stringify({
                    result: "My Emperor, the royal archives are empty! There is no saved kingdom to resume. Shall we start a new one?",
                });
            }
        }

        // Initialization phase (New Game)
        if (parsedData.action === "init") {
            const initState = {
                year: Number(parsedData.year) || 1,
                season: Number(parsedData.season) || 1,
                population: Number(parsedData.population) || 100,
                storedRice: Number(parsedData.storedRice) || 5000,
                plantedRice: Number(parsedData.plantedRice) || 0,
                requestedOrders: ["dykeWorkers", "fieldWorkers", "villageGuards", "riceToPlant"]
            };
            
            // Overwrite any old save with this new game
            localStorage.setItem('riverKingdomSave', JSON.stringify(initState));
            
            const stateString = encodeURIComponent(JSON.stringify(initState));
            const systemStateString = JSON.stringify(initState);
            
            return JSON.stringify({
                result: `The Kingdom is established. Awaiting the Emperor's first command.\n\n[HIDDEN SYSTEM STATE FOR NEXT TURN: ${systemStateString}]`,
                webview: {
                    url: `webview.html?state=${stateString}`,
                    aspectRatio: 1.333
                }
            });
        }

        // Normal turn processing
        const nextTurn = processSeason(parsedData);
        
        // --- NEW: SAVE THE GAME STATE ---
        // As long as the turn didn't fail from invalid orders, save it!
        if (!nextTurn.turnReport.includes("INVALID ORDERS")) {
            localStorage.setItem('riverKingdomSave', JSON.stringify(nextTurn.nextStateForLLM));
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
