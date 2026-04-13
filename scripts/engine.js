window['ai_edge_gallery_get_result'] = async (data) => {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        // Initialization phase
        if (parsedData.action === "init") {
            // Build the initial flat state
            const initState = {
                year: Number(parsedData.year) || 1,
                season: Number(parsedData.season) || 1,
                population: Number(parsedData.population) || 100,
                storedRice: Number(parsedData.storedRice) || 5000,
                plantedRice: Number(parsedData.plantedRice) || 0,
                requestedOrders: ["dykeWorkers", "fieldWorkers", "villageGuards", "riceToPlant"]
            };
            
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

        // Normal turn processing (Passing the entire flat object)
        const nextTurn = processSeason(parsedData);
        
        // We separate the UI state from the LLM state to keep the URL clean
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
